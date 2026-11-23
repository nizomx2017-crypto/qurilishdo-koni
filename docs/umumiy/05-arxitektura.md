# Arxitektura

Bu hujjat ilovaning asosiy qismlarini ko‘rsatadi.

- Frontend — mijoz uchun ochiq sayt va xodimlar paneli `/panel` (React + Vite, `code/frontend/`).
- Backend — katalog, buyurtma, xodimlar autentifikatsiyasi (login + kod, JWT) va huquqlar (RBAC) qoidalari (Node.js + Express REST API, `code/backend/`).
- Ma’lumotlar bazasi — kategoriya, mahsulot, buyurtma, xodim, role, huquq va sessiya ma’lumotlari (PostgreSQL, `code/database/`).

Frontend backend bilan faqat REST API (JSON) orqali ulanadi. Texnologiyalar bo‘yicha qaror: [08-texnologik-qarorlar.md](08-texnologik-qarorlar.md).
