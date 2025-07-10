# Fluxul de Confirmare pentru Ridicare și Returnare

## Logica de Confirmare

### 1. Confirmarea Ridicării (Pickup)

**Cine poate confirma:** Doar proprietarul echipamentului (cel care oferă echipamentul spre închiriere)

**Când apare butonul:** Când rezervarea are statusul `confirmed` (confirmată de proprietar)

**Unde apare butonul:** În tab-ul "Rezervări primite" din profilul proprietarului

**Ce face confirmarea:** Schimbă statusul din `confirmed` în `active` (închirierea începe)

### 2. Confirmarea Returnării (Return)

**Cine poate confirma:** Doar închiriatorul (cel care a închiriat echipamentul)

**Când apare butonul:** Când rezervarea are statusul `active` (închirierea este în curs)

**Unde apare butonul:** În tab-ul "Închirierile mele" din profilul închiriatorului

**Ce face confirmarea:** Schimbă statusul din `active` în `completed` (închirierea se termină)

## Fluxul Complet

### Pentru Proprietar (cel care oferă echipamentul):

1. **Primește rezervare** → Status: `pending`
2. **Acceptă rezervarea** → Status: `confirmed`
3. **Confirmă ridicarea** → Status: `active` (închirierea începe)
4. **Primește echipamentul înapoi** → Status: `completed` (confirmat de închiriator)

### Pentru Închiriator (cel care închiriază echipamentul):

1. **Face rezervare** → Status: `pending`
2. **Așteaptă confirmarea** → Status: `confirmed` (confirmat de proprietar)
3. **Ridică echipamentul** → Status: `active` (confirmat de proprietar)
4. **Confirmă returnarea** → Status: `completed` (închirierea se termină)

## Interfața Utilizator

### Tab-ul "Rezervări primite" (Proprietar):

- ✅ Buton "Acceptă" pentru rezervări `pending`
- ✅ Buton "Confirmă ridicarea" pentru rezervări `confirmed`
- ❌ Nu are buton pentru returnare (doar închiriatorul confirmă)

### Tab-ul "Închirierile mele" (Închiriator):

- ❌ Nu are buton pentru ridicare (doar proprietarul confirmă)
- ✅ Buton "Confirmă returnarea" pentru rezervări `active`
- ✅ Buton "Lasă recenzie" pentru rezervări `completed`

## Securitate și Validare

### Funcția `canConfirm()` din ConfirmationSystem:

```typescript
const canConfirm = () => {
  if (type === "pickup") {
    return isOwner && booking.status === "confirmed";
  } else {
    return isRenter && booking.status === "active";
  }
};
```

### Verificări:

- ✅ Doar proprietarul poate confirma ridicarea
- ✅ Doar închiriatorul poate confirma returnarea
- ✅ Butoanele apar doar în tab-urile corecte
- ✅ Statusul rezervării trebuie să fie corect
- ✅ Mesaje clare despre cine poate face ce

## Instrucțiuni pentru Utilizatori

### Pentru Proprietar (confirmare ridicare):

1. Verifică starea echipamentului înainte de predare
2. Testează funcționalitatea de bază
3. Fotografiază orice defect existent
4. Confirmă că ai predat echipamentul închiriatorului

### Pentru Închiriator (confirmare returnare):

1. Verifică că ai returnat echipamentul complet
2. Asigură-te că este în aceeași stare
3. Fotografiază starea la returnare
4. Confirmă că ai returnat echipamentul proprietarului

## Beneficii ale Acestui Sistem

✅ **Claritate** - Fiecare persoană știe exact ce trebuie să facă  
✅ **Securitate** - Doar persoana autorizată poate confirma  
✅ **Transparență** - Fluxul este clar și predictibil  
✅ **Documentare** - Fiecare confirmare poate avea observații  
✅ **Audit Trail** - Toate acțiunile sunt înregistrate în baza de date
