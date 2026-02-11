from pathlib import Path
import os
from datetime import timedelta
from decouple import config
from django.templatetags.static import static
from django.urls import reverse



BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = "django-6y#o!2%v7q3$k@8f9c^=x0b*5m+_n)1l4e(wr!%u@&a"

DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '*']

INSTALLED_APPS = [
    # Django Unfold - Must be before django.contrib.admin
    'unfold',
    'unfold.contrib.filters',
    'unfold.contrib.forms',
    'unfold.contrib.import_export',
    
    'django.contrib.sites',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist', 
    'corsheaders',
    'django_redis',
    
    # Local apps
    'accounts',
    'projects',
    'audit',
    'workspaces',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    # NOVEM custom middleware
    'audit.middleware.AuditMiddleware',  # Capture IP/user-agent for audit logs
    'core.middleware.RequestLoggingMiddleware',  # ADD THIS - Log API requests
    'core.middleware.MaintenanceModeMiddleware',  # ADD THIS - Handle maintenance mode
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'django.template.context_processors.static',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'novem_dev',
        'USER': 'postgres',
        'PASSWORD': '0987poiu',
        'HOST': 'localhost',
        'PORT': '5432',
        'CONN_MAX_AGE': 600,  # Persistent connections for better performance
        'OPTIONS': {
            'connect_timeout': 10,
        }
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [
    BASE_DIR / 'static',
]

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
    'EXCEPTION_HANDLER': 'core.exceptions.custom_exception_handler',
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.FormParser',
        'rest_framework.parsers.MultiPartParser',
    ],
}

# JWT Settings - Production-Ready Configuration
SIMPLE_JWT = {
    # Token lifetimes
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),  # Short-lived for security
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),      # 7 days for desktop app
    
    # Token rotation for enhanced security
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    
    # Algorithm and keys
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': "zejqq81)%c95^5w7&(9vn#2647%a$n#e+7vim%uz!ilxzmoinj",
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,
    
    # Headers
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    
    # Claims
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'USER_AUTHENTICATION_RULE': 'rest_framework_simplejwt.authentication.default_user_authentication_rule',
    
    # Token types
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
    'TOKEN_USER_CLASS': 'rest_framework_simplejwt.models.TokenUser',
    
    # JTI claim
    'JTI_CLAIM': 'jti',
    
    # Sliding tokens (not used, but configured)
    'SLIDING_TOKEN_REFRESH_EXP_CLAIM': 'refresh_exp',
    'SLIDING_TOKEN_LIFETIME': timedelta(minutes=30),
    'SLIDING_TOKEN_REFRESH_LIFETIME': timedelta(days=7),
}

# Redis Cache
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'SOCKET_CONNECT_TIMEOUT': 5,
            'SOCKET_TIMEOUT': 5,
            'RETRY_ON_TIMEOUT': True,
            'MAX_CONNECTIONS': 50,
           
        },
        'KEY_PREFIX': 'novem',
        'TIMEOUT': 300,  # 5 minutes default
    }
}

# Session configuration
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'
SESSION_COOKIE_AGE = 604800  # 7 days
SESSION_COOKIE_SECURE = False  # Set to True in production with HTTPS
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'

# CORS Configuration for Tauri Desktop App
CORS_ALLOWED_ORIGINS = [
    "http://localhost:1420",
    "http://127.0.0.1:1420",
    "tauri://localhost",
    "http://tauri.localhost",
    "https://tauri.localhost",
]

CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# Custom User Model
AUTH_USER_MODEL = 'accounts.User'

# Sites framework
SITE_ID = 1

# Email configuration (use SMTP in production)
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
EMAIL_HOST = 'localhost'
EMAIL_PORT = 1025
DEFAULT_FROM_EMAIL = 'noreply@novem.app'

# Authentication backends
AUTHENTICATION_BACKENDS = [
    'accounts.backends.EmailBackend',
    'django.contrib.auth.backends.ModelBackend',
]

# URLs
BACKEND_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://localhost:1420"

# NOVEM-Specific Settings
# Offline grace period (days)
OFFLINE_GRACE_PERIOD_DAYS = 7

# Metadata sync interval (seconds)
METADATA_SYNC_INTERVAL = 3600  # 1 hour

# Maintenance mode flag
MAINTENANCE_MODE = False

# Audit log retention (days)
AUDIT_LOG_RETENTION_DAYS = 90

# Maximum file upload size (bytes) - 500MB
MAX_UPLOAD_SIZE = 524288000

# Logging Configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {asctime} {message}',
            'style': '{',
        },
    },
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse',
        },
        'require_debug_true': {
            '()': 'django.utils.log.RequireDebugTrue',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs' / 'novem.log',
            'maxBytes': 1024 * 1024 * 10,  # 10 MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
        'audit_file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs' / 'audit.log',
            'maxBytes': 1024 * 1024 * 50,  # 50 MB
            'backupCount': 10,
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console', 'file'],
            'level': 'ERROR',
            'propagate': False,
        },
        'django.db.backends': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
        'accounts': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'audit': {
            'handlers': ['console', 'audit_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'workspaces': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'projects': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# Create logs directory if it doesn't exist
LOGS_DIR = BASE_DIR / 'logs'
LOGS_DIR.mkdir(exist_ok=True)


# Update UNFOLD configuration with professional monochrome theme

UNFOLD = {
    "SITE_TITLE": "NOVEM Admin",
    "SITE_HEADER": "NOVEM Control Panel",
    "SITE_URL": "/",
    "SITE_ICON": {
        "light": lambda request: static("images/logo.png"),
        "dark": lambda request: static("images/logo.png"),
    },
    "SITE_LOGO": {
        "light": lambda request: static("images/logo.png"),
        "dark": lambda request: static("images/logo.png"),
    },
    "SITE_SYMBOL": "speed",
    "SITE_FAVICONS": [
        {
            "rel": "icon",
            "sizes": "32x32",
            "type": "image/svg+xml",
            "href": lambda request: static("images/logo.png"),
        },
    ],
    "SHOW_HISTORY": True,
    "SHOW_VIEW_ON_SITE": True,
    "ENVIRONMENT": "NOVEM Development",
    "DASHBOARD_CALLBACK": "core.admin.dashboard_callback",
    "STYLES": [
        lambda request: static("admin/css/novem-admin.css"),
    ],
    "SCRIPTS": [],
    "COLORS": {
        "primary": {
            "50": "250 250 250",    # #fafafa - hover light
            "100": "245 245 245",   # #f5f5f5 - backgroundSecondary
            "200": "232 232 232",   # #e8e8e8 - backgroundTertiary
            "300": "224 224 224",   # #e0e0e0 - border
            "400": "204 204 204",   # #cccccc - textDisabled
            "500": "26 26 26",      # #1a1a1a - primary (main brand color)
            "600": "42 42 42",      # #2a2a2a - primaryHover
            "700": "31 31 31",      # #1f1f1f - backgroundTertiaryDark
            "800": "20 20 20",      # #141414 - backgroundSecondaryDark
            "900": "10 10 10",      # #0a0a0a - primaryActive/backgroundPrimaryDark
            "950": "0 0 0",         # #000000 - Darkest
        },
        "green": {
            "50": "236 253 245",    # #ecfdf5
            "100": "209 250 229",   # #d1fae5
            "200": "167 243 208",   # #a7f3d0
            "300": "105 240 174",   # #69F0AE - logoCyanLight
            "400": "52 211 153",    # #34d399
            "500": "0 200 83",      # #00C853 - logoCyan (accent)
            "600": "0 168 67",      # #00a843
            "700": "0 160 67",      # #00A043 - logoCyanDark
            "800": "0 104 35",      # #006823
            "900": "0 72 19",       # #004813
            "950": "0 40 10",       # #00280a
        },
        "red": {
            "50": "254 242 242",    # #fef2f2
            "100": "254 226 226",   # #fee2e2
            "200": "254 202 202",   # #fecaca
            "300": "252 165 165",   # #fca5a5
            "400": "248 113 113",   # #f87171
            "500": "245 34 45",     # #f5222d - error
            "600": "220 38 38",     # #dc2626
            "700": "185 28 28",     # #b91c1c
            "800": "153 27 27",     # #991b1b
            "900": "127 29 29",     # #7f1d1d
        },
        "orange": {
            "50": "255 251 235",    # #fffbeb
            "100": "254 243 199",   # #fef3c7
            "200": "253 230 138",   # #fde68a
            "300": "252 211 77",    # #fcd34d
            "400": "251 191 36",    # #fbbf24
            "500": "250 173 20",    # #faad14 - warning
            "600": "245 158 11",    # #f59e0b
            "700": "217 119 6",     # #d97706
            "800": "180 83 9",      # #b45309
            "900": "146 64 14",     # #92400e
        },
        "blue": {
            "50": "239 246 255",    # #eff6ff
            "100": "219 234 254",   # #dbeafe
            "200": "191 219 254",   # #bfdbfe
            "300": "147 197 253",   # #93c5fd
            "400": "96 165 250",    # #60a5fa
            "500": "24 144 255",    # #1890ff - info
            "600": "37 99 235",     # #2563eb
            "700": "29 78 216",     # #1d4ed8
            "800": "30 64 175",     # #1e40af
            "900": "30 58 138",     # #1e3a8a
        },
    },
    "SIDEBAR": {
        "show_search": True,
        "show_all_applications": True,
        "navigation": [
            {
                "title": "Dashboard",
                "separator": False,
                "collapsible": False,
                "items": [
                    {
                        "title": "Overview",
                        "icon": "dashboard",
                        "link": lambda request: reverse("admin:index"),
                    },
                ],
            },
            {
                "title": "User Management",
                "separator": True,
                "collapsible": True,
                "items": [
                    {
                        "title": "Users",
                        "icon": "person",
                        "link": lambda request: reverse("admin:accounts_user_changelist"),
                        "badge": "accounts.badges.user_count",
                    },
                    {
                        "title": "Profiles",
                        "icon": "badge",
                        "link": lambda request: reverse("admin:accounts_profile_changelist"),
                    },
                    {
                        "title": "Sessions",
                        "icon": "devices",
                        "link": lambda request: reverse("admin:accounts_usersession_changelist"),
                    },
                    {
                        "title": "Notifications",
                        "icon": "notifications",
                        "link": lambda request: reverse("admin:accounts_notification_changelist"),
                    },
                ],
            },
            {
                "title": "Workspaces",
                "separator": True,
                "collapsible": True,
                "items": [
                    {
                        "title": "All Workspaces",
                        "icon": "workspaces",
                        "link": lambda request: reverse("admin:workspaces_workspace_changelist"),
                        "badge": "workspaces.badges.workspace_count",
                    },
                    {
                        "title": "Memberships",
                        "icon": "group",
                        "link": lambda request: reverse("admin:workspaces_workspacemembership_changelist"),
                    },
                    {
                        "title": "Invitations",
                        "icon": "mail",
                        "link": lambda request: reverse("admin:workspaces_workspaceinvitation_changelist"),
                    },
                    {
                        "title": "Join Requests",
                        "icon": "transfer_within_a_station",
                        "link": lambda request: reverse("admin:workspaces_workspacejoinrequest_changelist"),
                    },
                ],
            },
            {
                "title": "Projects",
                "separator": True,
                "collapsible": True,
                "items": [
                    {
                        "title": "All Projects",
                        "icon": "folder",
                        "link": lambda request: reverse("admin:projects_project_changelist"),
                        "badge": "projects.badges.project_count",
                    },
                    {
                        "title": "Memberships",
                        "icon": "group_add",
                        "link": lambda request: reverse("admin:projects_projectmembership_changelist"),
                    },
                    {
                        "title": "Invitations",
                        "icon": "forward_to_inbox",
                        "link": lambda request: reverse("admin:projects_projectinvitation_changelist"),
                    },
                    {
                        "title": "Join Requests",
                        "icon": "how_to_reg",
                        "link": lambda request: reverse("admin:projects_projectjoinrequest_changelist"),
                    },
                ],
            },
            {
                "title": "Audit & Compliance",
                "separator": True,
                "collapsible": True,
                "items": [
                    {
                        "title": "Audit Logs",
                        "icon": "history",
                        "link": lambda request: reverse("admin:audit_auditlog_changelist"),
                    },
                    {
                        "title": "Access Logs",
                        "icon": "visibility",
                        "link": lambda request: reverse("admin:audit_accesslog_changelist"),
                    },
                    {
                        "title": "Sync Logs",
                        "icon": "sync",
                        "link": lambda request: reverse("admin:audit_synclog_changelist"),
                    },
                ],
            },
            {
                "title": "System",
                "separator": True,
                "collapsible": True,
                "items": [
                    {
                        "title": "Sites",
                        "icon": "language",
                        "link": lambda request: reverse("admin:sites_site_changelist"),
                    },
                ],
            },
        ],
    },
    "TABS": [
        {
            "models": [
                "accounts.user",
            ],
            "items": [
                {
                    "title": "User Details",
                    "link": lambda request, object_id=None: reverse(
                        "admin:accounts_user_change", args=[object_id]
                    ) if object_id else "#",
                },
            ],
        },
        {
            "models": [
                "workspaces.workspace",
            ],
            "items": [
                {
                    "title": "Workspace Details",
                    "link": lambda request, object_id=None: reverse(
                        "admin:workspaces_workspace_change", args=[object_id]
                    ) if object_id else "#",
                },
                {
                    "title": "Members",
                    "link": lambda request, object_id=None: (
                        reverse("admin:workspaces_workspacemembership_changelist")
                        + f"?workspace__id__exact={object_id}"
                    ) if object_id else "#",
                },
            ],
        },
        {
            "models": [
                "projects.project",
            ],
            "items": [
                {
                    "title": "Project Details",
                    "link": lambda request, object_id=None: reverse(
                        "admin:projects_project_change", args=[object_id]
                    ) if object_id else "#",
                },
                {
                    "title": "Members",
                    "link": lambda request, object_id=None: (
                        reverse("admin:projects_projectmembership_changelist")
                        + f"?project__id__exact={object_id}"
                    ) if object_id else "#",
                },
            ],
        },
    ],
}






