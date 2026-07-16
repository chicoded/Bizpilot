# Google Gmail + Drive backup setup (Zaplex)

Automatic **Backup now → Gmail / Drive** needs a Google Cloud OAuth **Web client ID**.
Without it, backups still save on the device and download a file.

## 1) Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project (e.g. `Zaplex`)
3. **APIs & Services → Library** → enable:
   - **Gmail API**
   - **Google Drive API**
4. **APIs & Services → OAuth consent screen**
   - User type: **External**
   - App name: `Zaplex`
   - User support email: your email
   - Developer contact: your email
   - Scopes → Add:
     - `https://www.googleapis.com/auth/gmail.send`
     - `https://www.googleapis.com/auth/drive.file`
     - `https://www.googleapis.com/auth/userinfo.email`
   - Test users → add the Gmail accounts that will connect (while app is in **Testing**)
5. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `Zaplex Backup`
   - **Authorized JavaScript origins:**
     - `https://www.zaplex.site`
     - `https://zaplex.site`
     - `http://localhost:3000`
   - **Authorized redirect URIs:**
     - `https://www.zaplex.site/settings/backup`
     - `https://zaplex.site/settings/backup`
     - `http://localhost:3000/settings/backup`
6. Copy the **Client ID**  
   (looks like `123456789-xxxx.apps.googleusercontent.com`)

## 2) Vercel (production)

1. [Vercel Dashboard](https://vercel.com) → your Zaplex project → **Settings → Environment Variables**
2. Add:

| Name | Value | Environments |
|------|-------|--------------|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | *(paste Client ID)* | Production, Preview, Development |

3. **Redeploy** Production (required — `NEXT_PUBLIC_*` is baked in at build time)

## 3) Local `.env.local` (optional)

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
```

Restart `npm run dev` after saving.

## 4) Test in the app

1. Open `https://www.zaplex.site/settings/backup`
2. Tap **Connect Google** → sign in → allow Gmail + Drive
3. Turn on **Gmail** and/or **Google Drive**
4. Tap **Backup now** / **Save backup to Drive now**

You should see a success message (email sent and/or file in Drive → **Zaplex Backups** folder).

## Notes

- Team catalog sync (Sales → Sync) uses the **Supabase database**, not Gmail/Drive.
- Gmail/Drive is only a **personal safety copy** of this device’s local data.
- OAuth tokens expire; if uploads fail, tap **Connect Google** again.
- While the consent screen is in **Testing**, only listed test users can connect.
