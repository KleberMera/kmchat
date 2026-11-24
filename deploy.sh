#!/bin/bash

set -e

echo "======================================"
echo "🚀 Desplegando Frontend KMCHAT..."
echo "======================================"

echo ""
echo "📥 Actualizando repositorio..."
git fetch --all
git pull

echo ""
echo "📦 Instalando dependencias..."
npm install

echo ""
echo "🏗️ Compilando Angular..."

# ng build 
#ng build --base-href /controlelectoral/
# ng build --configuration production --base-href /controlelectoral/

echo ""
echo "📂 Publicando archivos..."

sudo rsync -av --delete dist/SCE/browser/ /var/www/sce/

echo ""
echo "✅ Frontend desplegado correctamente."
echo "======================================"