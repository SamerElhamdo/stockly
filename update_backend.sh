echo "Pulling latest changes"
git pull

#upgrade pip
source .venv/bin/activate
pip install --upgrade pip


echo "Installing dependencies"
pip install -r requirements.txt

echo "Migrating database"
python manage.py migrate



echo "Restarting django"
sudo systemctl restart django.service
echo "Done"


# make sure let et excutite by using chmod +x update_backend.sh