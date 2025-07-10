# Email Templates Deployment Guide

## 🎨 GearUp Email Templates

All email templates have been created with:
- ✅ GearUp branding and colors
- ✅ Romanian language
- ✅ Mobile-responsive design
- ✅ Professional styling
- ✅ Security warnings and info boxes

## 📁 Template Files Created

```
supabase/templates/
├── confirmation.html      # Email confirmation
├── invite.html           # User invitations
├── recovery.html         # Password reset
├── magic_link.html       # Magic link login
├── email_change.html     # Email change confirmation
└── reauthentication.html # OTP verification
```

## 🚀 Deployment Methods

### Method 1: Local Development
```bash
# Restart Supabase to apply new config
supabase stop
supabase start
```

### Method 2: Production (Supabase Dashboard)
1. Go to Supabase Dashboard → Authentication → Email Templates
2. Copy content from each HTML file to corresponding template
3. Save changes

### Method 3: Automated Deployment
```bash
# Deploy to production
supabase db push
```

## 🎯 Template Features

### Design Elements
- **GearUp Logo**: Styled text logo in blue (#3b82f6)
- **Modern Cards**: Clean white containers with shadows
- **Responsive Buttons**: Blue CTA buttons that work on mobile
- **Color-coded Info Boxes**:
  - 🔵 Blue: Information
  - 🟡 Yellow: Warnings
  - 🟢 Green: Success/Security
  - 🔴 Red: Important alerts

### Content Features
- **Romanian Language**: All text in Romanian
- **GearUp Branding**: Consistent branding throughout
- **Security Messages**: Clear security warnings
- **Mobile Optimization**: Responsive design for all devices
- **Professional Footer**: Contact information and branding

## 📧 Template Variables Used

- `{{ .ConfirmationURL }}` - Confirmation links
- `{{ .Token }}` - OTP codes
- `{{ .NewEmail }}` - New email address
- `{{ .SiteURL }}` - Application URL

## 🔧 Customization

To customize further:
1. Edit the HTML files in `supabase/templates/`
2. Modify colors in the CSS (search for `#3b82f6`)
3. Update contact email (`support@gearup.ro`)
4. Add your logo image (replace text logo)

## ✅ Testing

Test each template by:
1. Creating a test user account
2. Triggering password reset
3. Requesting magic link
4. Changing email address
5. Checking mobile responsiveness

## 🎨 Brand Colors Used

- **Primary Blue**: #3b82f6
- **Dark Blue**: #1e40af
- **Light Blue**: #dbeafe
- **Success Green**: #22c55e
- **Warning Yellow**: #f59e0b
- **Gray**: #6b7280
- **Light Gray**: #f3f4f6 