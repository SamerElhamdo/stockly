from django.urls import path
from . import api, views

urlpatterns = [
    # WhatsApp Agent API
    path('process-message/', api.process_whatsapp_message, name='process_whatsapp_message'),
    path('send-message/', api.send_whatsapp_message, name='send_whatsapp_message'),
    path('status/', api.get_agent_status, name='agent_status'),
    
    # WhatsApp Agent Views
    path('settings/', views.agent_settings, name='agent_settings'),
    path('conversations/', views.conversation_history, name='conversation_history'),
    path('test/', views.test_agent, name='test_agent'),
]
