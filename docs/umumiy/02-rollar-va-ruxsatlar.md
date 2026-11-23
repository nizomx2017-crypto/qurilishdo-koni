# Rollar va ruxsatlar

Bu hujjat MVPdagi foydalanuvchi huquqlarini belgilaydi.

## Mijoz

Akkaunti yo‘q, ro‘yxatdan o‘tmaydi va login qilmaydi. Katalogni ko‘radi, qidiradi, savatchani (brauzerda) boshqaradi va buyurtma beradi. Ism, telefon va manzil faqat buyurtma berishda kiritiladi; buyurtma formasi captcha bilan himoyalangan.

## Xodimlar

Xodim o‘zi ro‘yxatdan o‘tmaydi — uni Administrator yoki Direktor yaratadi. Panelga **login + kod** (`XXXX-XXXX`) bilan kiradi. Har bir xodimning bitta role’i bor, role esa uch turdan biri:

| Role turi | Huquqlar |
|-----------|----------|
| `ADMIN` — Administrator | Barcha bo‘limlar va amallar. Barcha turdagi role va xodimlarni boshqaradi. Kirish urinishlari jurnalini ko‘radi |
| `DIRECTOR` — Direktor | Barcha bo‘limlar va amallar. Faqat `MANAGER` turidagi role va xodimlarni yaratadi, o‘zgartiradi, bloklaydi va ularga huquq beradi |
| `MANAGER` — Menejer | Faqat o‘z role’iga berilgan huquqlar. Boshqaruv bo‘limlariga (xodimlar, rollar) kira olmaydi |

Qoidalar:

- Hech kim o‘zini bloklay olmaydi va o‘z role’ini o‘zgartira olmaydi.
- Oxirgi faol Administratorni bloklab yoki Administratorlikdan chiqarib bo‘lmaydi.
- Huquq berilsa yoki olinsa, qayta login’siz darhol kuchga kiradi.

## Menejer huquqlari (sahifa × amal)

| Sahifa | Ko‘rish | Qo‘shish | Tahrirlash | O‘chirish | Arxivlash | Tasdiqlash |
|--------|:------:|:-------:|:---------:|:--------:|:--------:|:---------:|
| Buyurtmalar (`ORDER`) | ✔ | — | ✔ yo‘lga chiqarish, yetkazildi, bekor qilish | — | — | ✔ yangi → tasdiqlangan |
| Mahsulotlar (`PRODUCT`) | ✔ | ✔ | ✔ | ✔ | ✔ faol/nofaol | — |
| Kategoriyalar (`CATEGORY`) | ✔ | ✔ | ✔ | ✔ | ✔ faol/nofaol | — |
