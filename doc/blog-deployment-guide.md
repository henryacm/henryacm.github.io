# Blog Deployment Guide

This document explains how to deploy the blog correctly, how to recover when GitHub Actions gets stuck after multiple pushes, and how to confirm that production is serving the latest blog.

## Quick Recovery

Use this when `https://houwenpeng.com/blog/` is missing, stale, or not updated after a push.

1. Open the repository on GitHub.
2. Go to `Actions`.
3. Select the workflow named `Deploy GitHub Pages`.
4. If there are old runs still marked `Queued` or `In progress`, open the oldest stale run and choose `Cancel workflow`.
5. Return to `Actions -> Deploy GitHub Pages`.
6. Click `Run workflow`.
7. Choose branch `master`.
8. Click the green `Run workflow` button.
9. Wait for both jobs to finish:
   - `build`
   - `deploy`
10. Open `https://houwenpeng.com/blog/` in a private/incognito window, or refresh with cache disabled.

If the workflow succeeds but the blog is still stale, wait 1-3 minutes and refresh again. GitHub Pages and browser caches can lag slightly after deployment.

## Why This Can Happen

The workflow deploys the entire site from generated `_site/` output:

```text
source files -> _site/ -> GitHub Pages artifact -> GitHub Pages deployment
```

The blog is not deployed from the committed `blog/` folder. Production blog HTML is generated during GitHub Actions from:

```text
blog-src/
```

The current workflow also has:

```yaml
concurrency:
  group: pages
  cancel-in-progress: false
```

This means multiple pushes to `master` can queue behind an earlier Pages deployment instead of automatically canceling it. Usually this is safe. If an older run stalls, a later push may not reach deployment until the stale run is canceled or the workflow is manually triggered again.

## Normal Deployment

For a normal blog update:

1. Edit or add posts under:

```text
blog-src/content/posts/
```

2. Make sure the post is publishable:

```markdown
draft: false
```

3. Optional but recommended: build locally.

```powershell
.\build-blog.ps1
.\serve.ps1
```

4. Preview locally:

```text
http://127.0.0.1:8000/blog/
```

5. Commit and push:

```powershell
git add blog-src
git commit -m "Update blog"
git push
```

6. Watch the GitHub Action:

```text
GitHub repository -> Actions -> Deploy GitHub Pages
```

7. Confirm production:

```text
https://houwenpeng.com/blog/
```

## What The Action Does

The production workflow is:

```text
.github/workflows/deploy-pages.yml
```

It performs these steps:

1. Checks out the repository and submodules.
2. Installs Hugo Extended.
3. Installs image tooling for publication thumbnails.
4. Copies main site files into `_site/`.
5. Builds `blog-src/` into `_site/blog/`.
6. Verifies `_site/blog/index.html` exists.
7. Optimizes publication images in the deployment output.
8. Uploads `_site/` as the GitHub Pages artifact.
9. Deploys that artifact to GitHub Pages.

The important check is:

```bash
test -f _site/blog/index.html
```

If Hugo fails to build the blog, the Action should fail instead of deploying a site without `/blog/`.

## Manual Run From GitHub UI

Use this when a push does not deploy correctly.

1. Open GitHub.
2. Open this repository.
3. Click `Actions`.
4. In the left sidebar, click `Deploy GitHub Pages`.
5. Click `Run workflow`.
6. Select branch `master`.
7. Click `Run workflow`.
8. Wait for the new run to finish.

Manual runs are available because the workflow contains:

```yaml
on:
  workflow_dispatch:
```

## Cancel A Stuck Run

Use this before starting a manual deployment if an old run is still active.

1. Open `Actions`.
2. Select `Deploy GitHub Pages`.
3. Open the stuck run.
4. Click `Cancel workflow`.
5. Wait until it becomes `Cancelled`.
6. Start a new manual run from branch `master`.

Canceling stale runs is safest when:

- A run has been queued or in progress for an unusually long time.
- A newer push already exists.
- Production is still serving an older version.

## Check GitHub Pages Settings

The repository must use GitHub Actions as the Pages source:

```text
Settings -> Pages -> Build and deployment -> Source -> GitHub Actions
```

Do not use branch deployment for this site.

If GitHub Pages is set to deploy from a branch, GitHub may publish the repository files directly. That output will not include the generated production blog, because `/blog/` is local build output and should not be committed.

## Verify The Deployment

After the run succeeds, check these URLs:

```text
https://houwenpeng.com/
https://houwenpeng.com/blog/
https://houwenpeng.com/blog/posts/
https://houwenpeng.com/publications.html
```

Expected result:

- Homepage loads normally.
- `/blog/` shows the Hugo blog index.
- `/blog/posts/` shows the post list.
- Publications page still loads optimized thumbnails.

If only `/blog/` is stale, open it in a private window or temporarily add a cache-busting query:

```text
https://houwenpeng.com/blog/?refresh=1
```

## Optional GitHub CLI Commands

If GitHub CLI is installed and authenticated:

```powershell
gh workflow list
gh run list --workflow "Deploy GitHub Pages"
gh workflow run "Deploy GitHub Pages" --ref master
```

To rerun a specific failed run:

```powershell
gh run rerun RUN_ID
```

To cancel a stuck run:

```powershell
gh run cancel RUN_ID
```

Replace `RUN_ID` with the numeric ID shown by `gh run list`.

## Do Not Commit Generated Blog Output

Do not commit:

```text
blog/
_site/
```

These are generated outputs. The source of truth is:

```text
blog-src/
```

Production is generated by GitHub Actions.

## Official References

- [Manually running a workflow](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow)
- [Canceling a workflow run](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/cancel-a-workflow-run)
- [Using custom workflows with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Configuring a publishing source for GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
