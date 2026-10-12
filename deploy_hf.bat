@echo off
echo ==============================================
echo Deploying Backend to Hugging Face Spaces...
echo ==============================================
git checkout --orphan hf-deploy
git reset
git add backend api scripts manage.py requirements.txt Dockerfile README.md
git commit -m "Deploy backend update to Hugging Face Spaces"
git push -f hf hf-deploy:main
git checkout -f main
git branch -D hf-deploy
echo ==============================================
echo Deployment completed!
echo ==============================================
