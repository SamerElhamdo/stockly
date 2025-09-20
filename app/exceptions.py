from rest_framework.views import exception_handler
from rest_framework.response import Response


def custom_exception_handler(exc, context):
    """Return unified error shape: {detail, code, fields?}.
    Includes field errors for 400 responses, and preserves status code.
    """
    response = exception_handler(exc, context)

    if response is None:
        return Response({
            'detail': str(exc) or 'internal_error',
            'code': 'internal_error',
        }, status=500)

    data = response.data
    payload = {
        'detail': None,
        'code': getattr(getattr(exc, 'default_code', None), 'value', None) or getattr(exc, 'default_code', None) or 'error',
    }

    if isinstance(data, dict) and 'detail' in data:
        payload['detail'] = data['detail']
    else:
        payload['detail'] = 'validation_error' if response.status_code == 400 else 'error'

    if response.status_code == 400 and isinstance(data, dict):
        # Include field-level errors for validation issues
        payload['fields'] = data

    return Response(payload, status=response.status_code)


