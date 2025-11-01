# GitHub Actions - Vercel Preview Deployment

## Setup Instructions (For Team Members / Non-Owners)

This workflow uses Vercel CLI, which works even if you're not the project owner!

### 1. Get Your Vercel Access Token

1. Go to https://vercel.com/account/tokens
2. Click **Create Token**
3. Configure the token:
   - **Token Name**: `GitHub Actions` (or any name)
   - **Scope**: Select the team/account where your project lives
   - **Expiration**: Choose your preference (recommend 1 year for convenience)
4. Click **Create**
5. **IMPORTANT**: Copy the token immediately (it won't be shown again!)
   - Format: `vercel_xxxxxxxxxxxxxxxxxxxx`

### 2. Add Vercel Token to GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the secret:
   - **Name**: `VERCEL_TOKEN`
   - **Value**: Paste the token from step 1
5. Click **Add secret**

### 3. Verify Project Access

Make sure you have access to the Vercel project:
1. Go to your Vercel dashboard
2. Find the project (AdPilot)
3. Ensure you can see it (even with viewer access, this should work)

### 4. Test the Workflow

The workflow will automatically trigger when:
- You push to the `meta-pay-dialog-issue` branch
- You open/update a PR to the `main` branch

To manually test:
```bash
git add .
git commit -m "test: trigger vercel deployment"
git push origin meta-pay-dialog-issue
```

### 5. Monitor Deployment

After pushing:
1. Go to **Actions** tab in your GitHub repository
2. You should see a new workflow run called "Deploy to Vercel Preview"
3. Click on it to see the logs and deployment URL
4. Check your Vercel dashboard for the deployment status
5. For PRs, a comment will be added with the preview URL!

## Workflow Details

### Triggers
- **Push** to `meta-pay-dialog-issue` branch
- **Pull Requests** to `main` branch (opened, synchronized, reopened)

### What It Does
1. Checks out the code
2. Installs Vercel CLI
3. Pulls Vercel environment configuration
4. Builds the project
5. Deploys to Vercel preview
6. Comments on PR with preview URL (if it's a PR)

### Environment Variables Available
- `${{ github.ref_name }}` - Branch name
- `${{ github.sha }}` - Commit SHA
- `${{ secrets.VERCEL_TOKEN }}` - Your Vercel access token
- `${{ steps.deploy.outputs.url }}` - Deployment preview URL

## Troubleshooting

### Deployment not triggering?
- Verify the secret `VERCEL_TOKEN` is set correctly in GitHub Secrets
- Check if you have access to the Vercel project
- Ensure the workflow file is in `.github/workflows/` directory
- Verify branch name matches in workflow file

### Workflow failing with "No Project Settings found"?
This usually means the first deployment needs project setup:
1. Run `vercel` locally once to link the project
2. Or ask the project owner to run the first deployment
3. After the first deploy, the workflow should work

### Authentication errors?
- Regenerate your Vercel token: https://vercel.com/account/tokens
- Update the GitHub secret with the new token
- Ensure the token has access to the correct team/account

### Multiple deployments?
If you're getting duplicate deployments:
- Vercel's GitHub integration may also trigger deployments
- This is normal - Vercel will show both in the dashboard
- Consider disabling Vercel's GitHub app if you only want GitHub Actions deploys

## Advanced Configuration

### Deploy Only on Specific Paths
To trigger deployment only when certain files change:

```yaml
on:
  push:
    branches:
      - meta-pay-dialog-issue
    paths:
      - 'app/**'
      - 'components/**'
      - 'lib/**'
      - 'package.json'
      - 'next.config.js'
```

### Add Deployment Status Comment to PR
To add a comment to PRs with deployment status:

```yaml
- name: Comment on PR
  if: github.event_name == 'pull_request'
  uses: actions/github-script@v7
  with:
    script: |
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: '🚀 Vercel deployment triggered! Check your Vercel dashboard for status.'
      })
```

### Parallel Deployments for Multiple Environments
Deploy to different environments based on branch:

```yaml
jobs:
  deploy-preview:
    if: github.ref == 'refs/heads/meta-pay-dialog-issue'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install --global vercel@latest
      - run: vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}
      - run: vercel build --token=${{ secrets.VERCEL_TOKEN }}
      - run: vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }}

  deploy-production:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install --global vercel@latest
      - run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
      - run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
      - run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
```

## Security Notes

- **Vercel tokens are sensitive** - never commit them to the repository
- Always store tokens in GitHub Secrets
- Regenerate tokens if accidentally exposed
- Use scoped tokens (limit to specific projects/teams if possible)
- Set token expiration dates for better security

## Support

For issues with:
- **GitHub Actions**: Check the Actions tab logs in your repo
- **Vercel Deployments**: Check Vercel dashboard → Deployments
- **Vercel CLI**: Run `vercel --help` or check https://vercel.com/docs/cli
- **Access Tokens**: Manage at https://vercel.com/account/tokens
