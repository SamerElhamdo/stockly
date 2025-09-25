
echo "Installing dependencies"
npm install

echo "Removing old dist"      
rm -r frontend/dist

echo "Building new dist"
npm run build
echo "Building new dist"
echo "Restarting nginx"
sudo systemctl restart nginx

echo "Done"

# make sure let et excutite by using chmod +x update_ui.sh