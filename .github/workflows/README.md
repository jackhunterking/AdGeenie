# GitHub Actions - Vercel Preview Deployment

## Setup Instructions

### 1. Get Your Vercel Deploy Hook URL

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Git**
3. Scroll down to **Deploy Hooks**
4. Click **Create Hook**
5. Configure the hook:
   - **Hook Name**: `GitHub Actions Preview` (or any name)
   - **Git Branch**: `meta-pay-dialog-issue` (or leave empty for all branches)
6. Click **Create Hook**
7. Copy the generated URL (looks like: `https://api.vercel.com/v1/integrations/deploy/...`)

### 2. Add Deploy Hook to GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the secret:
   - **Name**: `VERCEL_DEPLOY_HOOK_URL`
   - **Value**: Paste the deploy hook URL from step 1
5. Click **Add secret**

### 3. Test the Workflow

The workflow will automatically trigger when:
- You push to the `meta-pay-dialog-issue` branch
- You open/update a PR to the `main` branch

To manually test:
```bash
git add .
git commit -m "test: trigger vercel deployment"
git push origin meta-pay-dialog-issue
```

### 4. Monitor Deployment

After pushing:
1. Go to **Actions** tab in your GitHub repository
2. You should see a new workflow run
3. Click on it to see the logs
4. Check your Vercel dashboard for the deployment status

## Workflow Details

### Triggers
- **Push** to `meta-pay-dialog-issue` branch
- **Pull Requests** to `main` branch (opened, synchronized, reopened)

### What It Does
1. Checks out the code
2. Calls the Vercel deploy hook
3. Logs deployment trigger confirmation

### Environment Variables Available
- `${{ github.ref_name }}` - Branch name
- `${{ github.sha }}` - Commit SHA
- `${{ secrets.VERCEL_DEPLOY_HOOK_URL }}` - Your deploy hook URL

## Troubleshooting

### Deployment not triggering?
- Verify the secret `VERCEL_DEPLOY_HOOK_URL` is set correctly
- Check if the deploy hook URL is valid in Vercel dashboard
- Ensure the workflow file is in `.github/workflows/` directory

### Workflow failing?
- Check the Actions tab for error messages
- Verify the deploy hook URL format
- Ensure you have write permissions to trigger Actions

### Multiple deployments?
If you're getting duplicate deployments:
- Vercel's GitHub integration may also trigger deployments
- Consider disabling automatic deployments in Vercel for this branch
- Or remove the Vercel GitHub integration and use only the deploy hook

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
Create separate deploy hooks for staging and production:

```yaml
jobs:
  deploy-staging:
    if: github.ref == 'refs/heads/meta-pay-dialog-issue'
    runs-on: ubuntu-latest
    steps:
      - run: curl -X POST "${{ secrets.VERCEL_STAGING_DEPLOY_HOOK }}"

  deploy-production:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: curl -X POST "${{ secrets.VERCEL_PRODUCTION_DEPLOY_HOOK }}"
```

## Security Notes

- Deploy hook URLs are sensitive - never commit them to the repository
- Always store them in GitHub Secrets
- Rotate deploy hooks if accidentally exposed
- Use separate hooks for different environments

## Support

For issues with:
- **GitHub Actions**: Check the Actions tab logs
- **Vercel Deployments**: Check Vercel dashboard logs
- **Deploy Hooks**: Verify in Vercel Settings → Git → Deploy Hooks
