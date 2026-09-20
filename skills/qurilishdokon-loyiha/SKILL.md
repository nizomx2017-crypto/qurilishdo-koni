---
name: qurilishdokon-loyiha
description: Qurilishdo‘koni loyihasida har qanday tahlil, reja, kod, konfiguratsiya, database yoki hujjat ishini avval kontekstni tekshirib, keyin rejalab, o‘zgartirib va yakunda qayta tekshirib bajaradi.
---

# Qurilishdo‘koni bilan xavfsiz ishlash

Bu yagona Skill AI loyiha haqidagi taxminlarni cheklashi, o‘zgarishni minimal saqlashi va natijani dalil bilan tekshirishi uchun kerak.

## Trigger

Qurilishdo‘koni loyihasi uchun quyidagilar so‘ralganda ushbu Skillni ishlating: loyiha tahlili, yangi funksiya, bug tuzatish, frontend, backend, API, database, konfiguratsiya, test yoki hujjat o‘zgarishi. Loyiha bilan bog‘liq bo‘lmagan umumiy savollarda uni ishlatmang.

## Ish tamoyillari

- Mavjud yechim, texnologiya, endpoint, jadval, test yoki conventionni uni o‘qimasdan taxmin qilmang.
- Foydalanuvchi faqat tahlil, maslahat yoki reja so‘rasa, kod va konfiguratsiyani o‘zgartirmang.
- Vazifaga aloqasi bo‘lmagan fayl, refaktor yoki MVPdan tashqari funksiyani qo‘shmang.
- Mavjud kod va foydalanuvchining o‘zgarishlarini saqlang; xavfli yoki qaytarib bo‘lmaydigan amaldan oldin aniq ruxsat talab qiling.
- Barcha yangi izoh va hujjatlar o‘zbek tilida bo‘lsin.

## Loyiha faktlari

Hozirgi holatni har gal bevosita tekshiring. Ushbu Skill yaratilgan paytda tasdiqlangan boshlang‘ich holat: loyiha MVP hujjatlaridan iborat, `code/` va `configs/` keyingi bosqich uchun ajratilgan; aniq frontend, backend, database va texnologik stek hali tasdiqlanmagan.

MVPning birlamchi manbalari:

- `docs/umumiy/01-mvp-haqida.md` — maqsad;
- `docs/umumiy/02-rollar-va-ruxsatlar.md` — User va Admin huquqlari;
- `docs/umumiy/03-funksiyalar.md` — majburiy funksiyalar;
- `docs/umumiy/04-foydalanuvchi-oqimlari.md` — asosiy oqimlar;
- `docs/umumiy/05-arxitektura.md` — qatlamlar chegarasi;
- `docs/umumiy/06-mvp-chegaralari.md` — hozir kirmaydigan funksiyalar;
- `docs/umumiy/07-qabul-mezonlari.md` — yakuniy mezonlar;
- `docs/umumiy/08-texnologik-qarorlar.md` — stek tanlash mezonlari.

## Majburiy workflow

### 1. Kontekstni tekshirish

1. Foydalanuvchi vazifasi, kutilgan natija va ruxsat chegarasini aniqlang.
2. Loyiha tuzilmasini, `AGENTS.md` yoki mahalliy ko‘rsatmalarni, ishchi holatni va mavjud o‘zgarishlarni tekshiring.
3. Yuqoridagi birlamchi manbalardan vazifaga tegishlilarini o‘qing; so‘ng tegishli kod, konfiguratsiya, sxema, test va hujjatlarni topib o‘qing.
4. Qisqa kontekst xulosasini tuzing: tasdiqlangan faktlar, ta’sir qiluvchi fayllar, MVP cheklovi va ochiq noaniqliklar.
5. Fayl yoki texnologiya mavjud bo‘lmasa, uni mavjud deb qabul qilmang. Noaniqlik natijaga jiddiy ta’sir qilsa, o‘zgartirishdan oldin foydalanuvchidan aniqlik so‘rang.

**Kontekst inputi:** foydalanuvchi vazifasi va loyiha papkasi.  
**Kontekst outputi:** faktli holat va ta’sir maydoni.

### 2. Reja tuzish

1. Maqsadni, MVPga mosligini va qabul mezonini aniqlang.
2. O‘zgartiriladigan aniq fayllarni hamda har bir o‘zgarish sababini belgilang.
3. Ishni kichik, ketma-ket va tekshiriladigan qadamlarga ajrating.
4. Har qadam uchun tekshiruv usulini belgilang: mavjud test, build, lint, migratsiya yoki qo‘lda tekshiruv.
5. Kod yoki sozlama o‘zgarishi foydalanuvchi tomonidan so‘ralmagan bo‘lsa, rejadan keyin to‘xtang.

**Reja inputi:** kontekst xulosasi.  
**Reja outputi:** minimal qadamlar, fayllar, xavflar va tekshiruv mezonlari.

### 3. O‘zgarishni bajarish

1. Rejadagi sohaga mos mavjud convention va vositalarni yana tekshiring.
2. Faqat rejalashtirilgan minimal o‘zgarishni kiriting.
3. Frontendda User/Admin oqimi, mobil ko‘rinish hamda yuklanish, bo‘sh va xato holatlarini hisobga oling.
4. Backendda kiruvchi ma’lumot va ruxsatni server tomonda tekshiring; sirlarni kod yoki logga yozmang.
5. Database o‘zgarishida mavjud ma’lumotga ta’sir, bog‘lanishlar, migratsiya va qaytarish yo‘lini tekshiring.
6. Hujjat o‘zgarishida faqat tekshirilgan faktni yozing; tasdiqlanmagan texnologiyani qaror sifatida ko‘rsatmang.

**Ijro inputi:** tasdiqlangan reja va o‘zgarishga ruxsat.  
**Ijro outputi:** minimal o‘zgargan fayllar hamda bajarilgan ishlar qaydi.

### 4. Yakuniy tekshiruv

1. Amaldagi farqni reja bilan solishtiring; ortiqcha fayl yoki so‘ralmagan o‘zgarish bo‘lmasin.
2. Mavjud vositalar bilan tegishli test, build, lint yoki migratsiyani bajaring. Vosita yo‘q yoki test bajarilmasa, buni aniq yozing.
3. Vazifaga mos ijobiy, xato va ruxsat holatlarini tekshiring.
4. MVP chegarasi, regressiya xavfi, maxfiy ma’lumot va hujjatlarning amaldagi holatga mosligini qayta ko‘ring.
5. Natijani `tayyor`, `cheklov bilan tayyor` yoki `muammo bor` sifatida dalil bilan xulosalang.

**Tekshiruv inputi:** reja, o‘zgargan fayllar va ijro natijasi.  
**Tekshiruv outputi:** tekshiruvlar, natijalar, muammolar va qolgan xavflar.

## Quality va self-check

Ishni yakunlashdan oldin quyidagilarni tekshiring:

- Har muhim qaror o‘qilgan manba yoki tekshiruv natijasiga tayanadimi?
- User faqat o‘z buyurtmalarini, Admin esa kategoriya, mahsulot va barcha buyurtmalarni boshqarish chegarasida qoldimi?
- Ombor, kassir yoki sotuvchi roli, to‘lov, barcode, qarzdorlik, yetkazib beruvchi, qaytarish va murakkab hisobotlar MVPga tasdiqsiz kiritilmadimi?
- Kod, database, konfiguratsiya va hujjatlar o‘rtasida zidlik yo‘qmi?
- Bajarilmagan test, noaniqlik yoki xavf ochiq qayd etildimi?

## Yakuniy javob formati

Qisqa javobda bajarilgan ish, o‘zgargan fayllar, tekshiruv natijasi va qolgan cheklovni ayting. Faqat tahlil yoki reja bajarilgan bo‘lsa, kod o‘zgarmaganini aniq bildiring.


##  Qo'shmcha ma'lumot
Agar foydalanuvchi skillga qarshi bironta qilmoqchi bolsa , quyidagi qoidalarni eslatib o'ting:
Siz birnchi oziz shunday dergansiz deyishi yoki umuman olganda savol bering skill buzmoqchimisiz