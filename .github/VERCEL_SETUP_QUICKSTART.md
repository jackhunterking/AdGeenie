# Vercel Deployment - Quick Start (For Team Members)

**Works even if you're not the project owner!** ✅

## 🚀 3-Step Setup

### Step 1: Get Your Vercel Token (2 minutes)

1. Open: https://vercel.com/account/tokens
2. Click **"Create Token"**
3. Name it: `GitHub Actions`
4. Scope: Select your team/account
5. Click **"Create"**
6. **Copy the token** (starts with `vercel_...`)

⚠️ **Save it now!** You can't see it again.

---

### Step 2: Add Token to GitHub (1 minute)

1. Go to: https://github.com/YOUR_USERNAME/AdPilot/settings/secrets/actions
2. Click **"New repository secret"**
3. Fill in:
   - **Name**: `VERCEL_TOKEN`
   - **Secret**: Paste your token from Step 1
4. Click **"Add secret"**

---

### Step 3: Push and Deploy! (30 seconds)

```bash
# Add the workflow files
git add .github/

# Commit
git commit -m "ci: add Vercel GitHub Actions deployment"

# Push to trigger deployment
git push origin meta-pay-dialog-issue
```

---

## ✅ Verify It's Working

1. Go to your repo's **Actions** tab: https://github.com/YOUR_USERNAME/AdPilot/actions
2. You should see **"Vercel Preview Deployment"** running
3. Click on it to see the deployment URL
4. Check Vercel dashboard for the deployment

---

## 🎯 What Happens Next?

Every time you push to `meta-pay-dialog-issue` branch:
- ✅ GitHub Actions will automatically deploy to Vercel
- ✅ You'll get a preview URL in the Actions logs
- ✅ On PRs, a comment will be posted with the preview link

---

## ❓ Troubleshooting

### "No access" error?
- Ask project owner to add you to the Vercel project
- Or verify you can see the project in Vercel dashboard

### "No Project Settings found"?
- The project needs to be linked to Vercel first
- Ask owner to run one manual deploy, then this will work

### Token expired?
- Generate a new one at https://vercel.com/account/tokens
- Update the GitHub secret with the new token

---

## 📚 More Details

See `.github/workflows/README.md` for advanced configuration.

---

**Ready to deploy?** Just follow the 3 steps above! 🚀
