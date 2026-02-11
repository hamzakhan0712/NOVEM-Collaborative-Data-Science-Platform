from django.db.models import Count
from .models import User


def user_count(request):
    """Return active user count for admin sidebar badge"""
    return User.objects.filter(account_state=User.AccountState.ACTIVE).count()

