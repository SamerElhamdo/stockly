from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt, csrf_protect, ensure_csrf_cookie
from django.utils.decorators import method_decorator
from django.views.decorators.http import require_http_methods
from .forms import LoginForm, UserRegistrationForm
from .decorators import company_owner_required, company_staff_required, api_company_owner_required, api_company_staff_required
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from .models import User, Invoice, InvoiceItem
import json
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.fonts import addMapping
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
import arabic_reshaper
from bidi.algorithm import get_display
import io

def format_arabic_text(text):
    """Format Arabic text for proper display in PDF"""
    if not text:
        return text
    try:
        # Reshape Arabic text
        reshaped_text = arabic_reshaper.reshape(text)
        # Apply bidirectional algorithm
        bidi_text = get_display(reshaped_text)
        return bidi_text
    except:
        # Fallback to original text if reshaping fails
        return text

# Authentication Views
@ensure_csrf_cookie
def auth_view(request):
    """Unified authentication page with login, company registration, and staff registration"""
    if request.user.is_authenticated:
        # Check if user has access to the system
        if request.user.is_superuser or request.user.account_type in ['superuser', 'company_owner', 'company_staff']:
            return redirect('dashboard')
        else:
            # User doesn't have proper access, logout and show error
            logout(request)
            messages.error(request, 'ليس لديك صلاحية للوصول إلى النظام')
    
    if request.method == 'POST':
        form = LoginForm(data=request.POST)
        if form.is_valid():
            user = form.get_user()
            if user:
                login(request, user)
                # Create or get token for API authentication
                token, created = Token.objects.get_or_create(user=user)
                # messages.success(request, f'مرحباً {user.first_name or user.username}!')
                return redirect('dashboard')
            else:
                messages.error(request, 'اسم المستخدم أو كلمة المرور غير صحيحة')
        else:
            messages.error(request, 'يرجى التحقق من البيانات المدخلة')
    else:
        form = LoginForm()
    
    return render(request, 'auth.html', {'form': form})

@ensure_csrf_cookie
def login_view(request):
    """Legacy login view - redirects to auth"""
    return redirect('auth')

def logout_view(request):
    logout(request)
    messages.info(request, 'تم تسجيل الخروج بنجاح')
    return redirect('auth')

# Protected Views
@company_staff_required
def dashboard(request):
    return render(request, "dashboard.html")

@company_staff_required
def customers(request):
    return render(request, "customers.html")

@company_staff_required
def products(request):
    return render(request, "products.html")

@company_staff_required
def categories(request):
    return render(request, "categories.html")

@company_staff_required
def invoices(request):
    return render(request, "invoices.html")

@company_staff_required
def invoice_page(request, session_id):
    return render(request, "invoice.html", {"session_id": session_id})

# User Management Views
@company_owner_required
def user_management(request):
    # Show only users from the same company, excluding superuser
    if request.user.is_superuser:
        # Superuser can see all users except other superusers
        users = User.objects.filter(account_type__in=['company_owner', 'company_staff']).order_by('-created_at')
    else:
        # Company admin can only see users from their company
        users = User.objects.filter(company=request.user.company).order_by('-created_at')
    
    return render(request, 'user_management.html', {'users': users})

@company_owner_required
def add_user(request):
    if request.method == 'POST':
        form = UserRegistrationForm(request.POST)
        if form.is_valid():
            user = form.save(commit=False)
            # Set company for the new user
            user.company = request.user.company
            user.account_type = 'company_staff'  # New users are always staff
            user.save()
            messages.success(request, f'تم إنشاء المستخدم {user.username} بنجاح')
            return redirect('user_management')
    else:
        form = UserRegistrationForm()
    
    return render(request, 'add_user.html', {'form': form})

# PDF Invoice Generation
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def invoice_pdf(request, invoice_id):
    # Check if user is admin
    if request.user.user_type != 'admin':
        return HttpResponse('{"error": "Admin access required"}', status=403, content_type='application/json')
    try:
        # Get invoice data
        invoice = get_object_or_404(Invoice, id=invoice_id)
        invoice_items = InvoiceItem.objects.filter(invoice=invoice).select_related('product')
        
        # Create PDF buffer
        buffer = io.BytesIO()
        
        # Register Arabic font
        try:
            # Try to register Noto Sans Arabic font
            pdfmetrics.registerFont(TTFont('NotoSansArabic', 'static/fonts/NotoSansArabic-Regular.ttf'))
        except:
            try:
                # Try to register a Unicode font that supports Arabic
                pdfmetrics.registerFont(UnicodeCIDFont('Helvetica'))
            except:
                try:
                    # Try to register Arial Unicode MS if available
                    pdfmetrics.registerFont(TTFont('ArialUnicode', '/System/Library/Fonts/Arial Unicode MS.ttf'))
                except:
                    try:
                        # Try to register DejaVu Sans which supports Arabic
                        pdfmetrics.registerFont(TTFont('DejaVuSans', '/System/Library/Fonts/DejaVu Sans.ttf'))
                    except:
                        # Fallback to default font
                        pass
        
        # Create PDF document
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
        
        # Get styles
        styles = getSampleStyleSheet()
        
        # Determine which font to use
        arabic_font = 'Helvetica'  # Default
        try:
            pdfmetrics.getFont('NotoSansArabic')
            arabic_font = 'NotoSansArabic'
        except:
            try:
                pdfmetrics.getFont('ArialUnicode')
                arabic_font = 'ArialUnicode'
            except:
                try:
                    pdfmetrics.getFont('DejaVuSans')
                    arabic_font = 'DejaVuSans'
                except:
                    arabic_font = 'Helvetica'
        
        # Create custom styles for Arabic text
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=colors.darkblue,
            fontName=arabic_font
        )
        
        header_style = ParagraphStyle(
            'CustomHeader',
            parent=styles['Heading2'],
            fontSize=16,
            spaceAfter=12,
            alignment=TA_RIGHT,
            textColor=colors.darkblue,
            fontName=arabic_font
        )
        
        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontSize=12,
            alignment=TA_RIGHT,
            spaceAfter=6,
            fontName=arabic_font
        )
        
        # Build PDF content
        story = []
        
        # Title
        story.append(Paragraph(format_arabic_text("فاتورة مبيعات"), title_style))
        story.append(Spacer(1, 20))
        
        # Invoice header information
        status_display = {
            'confirmed': 'مؤكدة',
            'draft': 'مسودة', 
            'cancelled': 'ملغاة'
        }.get(invoice.status, 'غير محدد')
        
        header_data = [
            [format_arabic_text('رقم الفاتورة:'), str(invoice.id)],
            [format_arabic_text('التاريخ:'), invoice.created_at.strftime('%Y-%m-%d')],
            [format_arabic_text('الزبون:'), format_arabic_text(invoice.customer.name if invoice.customer else 'غير محدد')],
            [format_arabic_text('الهاتف:'), invoice.customer.phone if invoice.customer and invoice.customer.phone else 'غير محدد'],
            [format_arabic_text('الحالة:'), format_arabic_text(status_display)]
        ]
        
        header_table = Table(header_data, colWidths=[2*inch, 3*inch])
        header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, -1), arabic_font),
            ('FONTSIZE', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('BACKGROUND', (1, 0), (1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(header_table)
        story.append(Spacer(1, 30))
        
        # Invoice items table
        if invoice_items:
            # Table headers
            table_data = [[format_arabic_text('الكمية'), format_arabic_text('الوحدة'), format_arabic_text('السعر'), format_arabic_text('المجموع'), format_arabic_text('اسم المنتج')]]
            
            # Add items
            total_amount = 0
            for item in invoice_items:
                item_total = float(item.qty) * float(item.price_at_add)
                total_amount += item_total
                
                # Get unit display from product
                unit_display = item.product.get_unit_display() if hasattr(item.product, 'get_unit_display') else '-'
                
                table_data.append([
                    str(item.qty),
                    format_arabic_text(unit_display),
                    f"{item.price_at_add:.2f} $",
                    f"{item_total:.2f} $",
                    format_arabic_text(item.product.name)
                ])
            
            # Add total row
            table_data.append(['', '', '', f"{total_amount:.2f} $", format_arabic_text('المجموع الكلي')])
            
            # Create table
            items_table = Table(table_data, colWidths=[1*inch, 1*inch, 1.5*inch, 1.5*inch, 2*inch])
            items_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), arabic_font),
                ('FONTSIZE', (0, 0), (-1, 0), 14),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -2), colors.beige),
                ('BACKGROUND', (0, -1), (-1, -1), colors.lightgrey),
                ('FONTNAME', (0, 1), (-1, -1), arabic_font),
                ('FONTSIZE', (0, 1), (-1, -1), 12),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(Paragraph(format_arabic_text("تفاصيل الفاتورة"), header_style))
            story.append(Spacer(1, 10))
            story.append(items_table)
        else:
            story.append(Paragraph(format_arabic_text("لا توجد عناصر في هذه الفاتورة"), normal_style))
        
        # Footer
        story.append(Spacer(1, 30))
        story.append(Paragraph(format_arabic_text("شكراً لتعاملكم معنا"), normal_style))
        story.append(Paragraph(format_arabic_text("Stockly - نظام إدارة المخزون"), normal_style))
        
        # Build PDF
        doc.build(story)
        
        # Get PDF content
        pdf_content = buffer.getvalue()
        buffer.close()
        
        # Create HTTP response
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="invoice_{invoice_id}.pdf"'
        response.write(pdf_content)
        
        return response
        
    except Exception as e:
        return HttpResponse(f"خطأ في إنشاء PDF: {str(e)}", status=500)


# Legacy views - redirect to auth
def register_company(request):
    """Legacy company registration view - redirects to auth"""
    return redirect('auth')

def register_staff(request):
    """Legacy staff registration view - redirects to auth"""
    return redirect('auth')


@company_staff_required
def returns(request):
    """Returns management page"""
    return render(request, 'returns.html')


@company_staff_required
def return_details(request, return_id):
    """Return details page"""
    return render(request, 'return_details.html', {'return_id': return_id})


@company_staff_required
def payments(request):
    """Payments page"""
    return render(request, 'payments.html')