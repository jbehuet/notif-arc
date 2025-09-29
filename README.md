# 🎯 NotifArc

**NotifArc** est une application web qui permet de souscrire par mail à la notification de dépôt d'un nouveau
de tir à 18m sur le site [crnata.fr](http://crnata.fr)

---

## 🚀 Démarrage local

### 1. Clonez le dépôt

```bash
git clone https://github.com/jbehuet/notif-arc.git
cd notif-arc
```

### 2. Installez les dépendances

```bash
npm install
```

### 3. Créez le fichier `.env.local`

```env
NETLIFY_SITE_ID=
NETLIFY_AUTH_TOKEN=
RESEND_API_KEY=votre_resend_key
```

### 4. Éxécuter

```bash
npm run dev
```

L'application est accessible sur [http://localhost:5173](http://localhost:5173)

---

## 🏗️ Déploiement

Le projet peut être déployé sur [Netlify](https://www.netlify.com/): [notif-arc.fr](https://www.notif-arc.fr/)

---

## 📦 Stack technique

- [SvelteKit](https://svelte.dev/)
- [PicoCSS](https://picocss.com/)

## 🧩 API Externes
- [Resend](https://resend.com)

---

## 📄 Licence

Projet libre et open source – MIT License.

---

## 🙌 Contribuer

Les contributions sont les bienvenues !  
Améliorez une fonctionnalité, proposez en des nouvelles, ou ouvrez une issue ✨