import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Direction } from 'radix-ui'
import { Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

export type Lang = 'en' | 'fr' | 'ar'
export const LANGS: { id: Lang; name: string }[] = [
  { id: 'en', name: 'English' },
  { id: 'fr', name: 'Français' },
  { id: 'ar', name: 'العربية' },
]
export const dirOf = (l: Lang): 'ltr' | 'rtl' => (l === 'ar' ? 'rtl' : 'ltr')
const KEY = 'app_lang'

const en: Record<string, string> = {
  'common.save': 'Save', 'common.saving': 'Saving…', 'common.saved': 'Saved', 'common.saveError': 'Not saved, try again', 'ed.adminOnly': 'Only the admin can change this block',
  'common.cancel': 'Cancel', 'common.delete': 'Delete', 'common.remove': 'Remove', 'common.add': 'Add',
  'common.error': 'Something went wrong.', 'common.retry': 'Try again', 'common.reconnecting': 'Reconnecting…',
  'nav.home': 'Home', 'nav.account': 'Account settings', 'nav.signout': 'Sign out', 'nav.lang': 'Language', 'nav.theme': 'Light or dark', 'nav.menu': 'Account menu',
  'auth.title': 'Sign in', 'auth.subtitle': 'Use the email and password you were given.', 'auth.email': 'Email', 'auth.password': 'Password',
  'auth.signin': 'Sign in', 'auth.wait': 'Please wait…', 'auth.error': 'Wrong email or password.',
  
  'dash.title': 'Pages', 'dash.subtitle': 'Every page on the platform. Create accounts in the admin panel.',
  'dash.empty': 'No pages yet. Create an account in the admin panel first.', 'dash.noPage': 'Your page isn’t ready yet. Contact the administrator.',
  'dash.edit': 'Edit', 'dash.view': 'View', 'dash.published': 'Published', 'dash.draft': 'Draft', 'dash.owner': 'Owner',
  'ed.back': 'Pages', 'ed.publish': 'Publish', 'ed.update': 'Update page', 'ed.publishing': 'Publishing…', 'ed.viewLive': 'View page',
  'ed.tabContent': 'Content', 'ed.tabDesign': 'Design', 'ed.tabSettings': 'Settings', 'ed.tabStats': 'Statistics',
  'ed.addBlock': 'Add block', 'ed.pickBlock': 'Choose a block', 'ed.confirmDel': 'Delete this block?', 'ed.confirmDelDesc': 'Its content is removed. This can’t be undone.',
  'ed.hide': 'Hide on page', 'ed.show': 'Show on page', 'ed.drag': 'Drag to reorder', 'ed.edit': 'Edit', 'ed.preview': 'Preview',
  'ed.noBlocks': 'No blocks yet.', 'ed.userHint': 'Edit your buttons, icons and numbers. Changes go live on your page automatically.',
  'ed.adminHint': 'Edits stay in draft until you publish.', 'ed.previewTitle': 'Page preview',
  'b.profile': 'Profile', 'b.links': 'Links', 'b.socials': 'Social icons', 'b.phone': 'Phone button', 'b.vcard': 'Save contact', 'b.embed': 'Videos and posts', 'b.gallery': 'Gallery',
  'bd.profile': 'Photo, name and bio', 'bd.links': 'Buttons with icons', 'bd.socials': 'Round icons for your accounts', 'bd.phone': 'One button, several numbers',
  'bd.vcard': 'Adds you to phone contacts', 'bd.embed': 'YouTube, Shorts, TikTok, Instagram, X, Facebook', 'bd.gallery': 'Grid of images',
  'f.name': 'Name', 'f.bio': 'Bio', 'f.photo': 'Photo', 'f.label': 'Button text', 'f.url': 'Link', 'f.icon': 'Icon', 'f.chooseIcon': 'Choose icon',
  'f.searchIcons': 'Search icons (instagram, whatsapp…)', 'f.uploadIcon': 'Upload your own icon', 'f.noIcon': 'No icon', 'f.addLink': 'Add link', 'f.addSocial': 'Add account',
  'f.numbers': 'Numbers', 'f.number': 'Phone number', 'f.numberLabel': 'Name (optional)', 'f.addNumber': 'Add number', 'f.phoneHint': 'With several numbers, visitors pick which one to call.',
  'f.firstName': 'First name', 'f.lastName': 'Last name', 'f.org': 'Company', 'f.jobTitle': 'Job title', 'f.email': 'Email', 'f.website': 'Website',
  'f.address': 'Address', 'f.note': 'Note', 'f.vcardHint': 'Visitors tap the button and the contact opens in their phone’s contacts app.',
  'f.heading': 'Title (optional)', 'f.embedUrl': 'Paste a link', 'f.addEmbed': 'Add video or post', 'f.unsupported': 'This link isn’t supported',
  'f.images': 'Images', 'f.addImage': 'Add image', 'f.upload': 'Upload image', 'f.uploading': 'Uploading…', 'f.uploadHint': 'PNG, JPG, WebP, GIF or SVG. Big photos are shrunk for you',
  'f.tooLarge': 'The image is larger than 5 MB.', 'f.badType': 'Use a PNG, JPG, WebP, GIF or SVG image. iPhone HEIC photos do not work.', 'f.tooMany': 'Upload limit reached.', 'f.uploadFailed': 'Upload failed.',
  'f.moveUp': 'Move up', 'f.moveDown': 'Move down', 'f.altText': 'Image description',
  'd.font': 'Font', 'd.colors': 'Colors', 'd.textColor': 'Text', 'd.accent': 'Accent', 'd.background': 'Background',
  'd.bgColor': 'Color', 'd.bgGradient': 'Gradient', 'd.bgImage': 'Image', 'd.color1': 'Top color', 'd.color2': 'Bottom color',
  'd.overlay': 'Overlay color', 'd.overlayOpacity': 'Overlay strength', 'd.buttons': 'Buttons', 'd.btnSolid': 'Solid', 'd.btnOutline': 'Outline', 'd.btnGlass': 'Glass',
  'd.btnColor': 'Button color', 'd.btnText': 'Button text', 'd.glassOpacity': 'Glass opacity', 'd.glassBlur': 'Glass blur', 'd.glassHint': 'Glass works best over an image or gradient background.',
  'd.corners': 'Corners', 'd.shadow': 'Shadow', 'd.textShadow': 'Text shadow', 'd.textShadowHint': 'Keeps the name readable on busy backgrounds.',
  'd.avatarGlow': 'Logo glow', 'd.glowLogo': 'Logo colors', 'd.glowColor': 'Glow color', 'd.glowStrength': 'Glow strength', 'd.glowAll': 'Glow everywhere', 'd.glowAllHint': 'Same halo on the buttons, the icons and the name.', 'd.glassPanel': 'Glass panel behind the links', 'd.glassPanelHint': 'Puts the link buttons on one frosted card.', 'd.avatarGlowHint': 'A soft blurred halo behind the logo.',
  'd.direction': 'Text direction', 'd.ltr': 'Left to right', 'd.rtl': 'Right to left', 'd.mode': 'Browser theme', 'd.light': 'Light', 'd.dark': 'Dark',
  'd.none': 'None', 'd.small': 'Small', 'd.medium': 'Medium', 'd.large': 'Large', 'd.round': 'Round',
  's.title': 'Page title', 's.seoTitle': 'Title in search results', 's.seoDesc': 'Description in search results', 's.favicon': 'Browser tab icon',
  'st.views': 'Views', 'st.clicks': 'Clicks', 'st.range7': '7 days', 'st.range30': '30 days', 'st.rangeAll': 'All time',
  'st.perDay': 'Views per day', 'st.byItem': 'Clicks per button', 'st.noData': 'No visits in this period yet.', 'st.removed': 'Removed item',
  'st.kind.links': 'Link', 'st.kind.socials': 'Social', 'st.kind.embed': 'Video', 'st.kind.phone': 'Phone', 'st.kind.vcard': 'Contact', 'st.kind.removed': 'Removed',
  'acct.title': 'Account settings', 'acct.changePw': 'Change password', 'acct.changePwHint': 'At least 8 characters. Your other devices are signed out.',
  'acct.currentPw': 'Current password', 'acct.newPw': 'New password', 'acct.updatePw': 'Update password', 'acct.pwSaved': 'Password updated.', 'acct.pwError': 'Couldn’t update the password.',
  
  
}

const fr: Record<string, string> = {
  'common.save': 'Enregistrer', 'common.saving': 'Enregistrement…', 'common.saved': 'Enregistré', 'common.saveError': 'Non enregistré, réessayez', 'ed.adminOnly': 'Seul l’admin peut modifier ce bloc',
  'common.cancel': 'Annuler', 'common.delete': 'Supprimer', 'common.remove': 'Retirer', 'common.add': 'Ajouter',
  'common.error': 'Une erreur est survenue.', 'common.retry': 'Réessayer', 'common.reconnecting': 'Reconnexion…',
  'nav.home': 'Accueil', 'nav.account': 'Paramètres du compte', 'nav.signout': 'Se déconnecter', 'nav.lang': 'Langue', 'nav.theme': 'Clair ou sombre', 'nav.menu': 'Menu du compte',
  'auth.title': 'Connexion', 'auth.subtitle': 'Utilisez l’e-mail et le mot de passe qui vous ont été remis.', 'auth.email': 'E-mail', 'auth.password': 'Mot de passe',
  'auth.signin': 'Se connecter', 'auth.wait': 'Patientez…', 'auth.error': 'E-mail ou mot de passe incorrect.',
  
  'dash.title': 'Pages', 'dash.subtitle': 'Toutes les pages de la plateforme. Créez les comptes dans le panneau d’administration.',
  'dash.empty': 'Aucune page. Créez d’abord un compte dans le panneau d’administration.', 'dash.noPage': 'Votre page n’est pas encore prête. Contactez l’administrateur.',
  'dash.edit': 'Modifier', 'dash.view': 'Voir', 'dash.published': 'Publiée', 'dash.draft': 'Brouillon', 'dash.owner': 'Propriétaire',
  'ed.back': 'Pages', 'ed.publish': 'Publier', 'ed.update': 'Mettre à jour', 'ed.publishing': 'Publication…', 'ed.viewLive': 'Voir la page',
  'ed.tabContent': 'Contenu', 'ed.tabDesign': 'Design', 'ed.tabSettings': 'Réglages', 'ed.tabStats': 'Statistiques',
  'ed.addBlock': 'Ajouter un bloc', 'ed.pickBlock': 'Choisir un bloc', 'ed.confirmDel': 'Supprimer ce bloc ?', 'ed.confirmDelDesc': 'Son contenu sera supprimé définitivement.',
  'ed.hide': 'Masquer sur la page', 'ed.show': 'Afficher sur la page', 'ed.drag': 'Glisser pour réordonner', 'ed.edit': 'Modifier', 'ed.preview': 'Aperçu',
  'ed.noBlocks': 'Aucun bloc.', 'ed.userHint': 'Modifiez vos boutons, icônes et numéros. Les changements sont en ligne automatiquement.',
  'ed.adminHint': 'Les modifications restent en brouillon jusqu’à la publication.', 'ed.previewTitle': 'Aperçu de la page',
  'b.profile': 'Profil', 'b.links': 'Liens', 'b.socials': 'Icônes réseaux', 'b.phone': 'Bouton téléphone', 'b.vcard': 'Enregistrer le contact', 'b.embed': 'Vidéos et publications', 'b.gallery': 'Galerie',
  'bd.profile': 'Photo, nom et bio', 'bd.links': 'Boutons avec icônes', 'bd.socials': 'Icônes rondes de vos comptes', 'bd.phone': 'Un bouton, plusieurs numéros',
  'bd.vcard': 'Ajoute votre fiche aux contacts', 'bd.embed': 'YouTube, Shorts, TikTok, Instagram, X, Facebook', 'bd.gallery': 'Grille d’images',
  'f.name': 'Nom', 'f.bio': 'Bio', 'f.photo': 'Photo', 'f.label': 'Texte du bouton', 'f.url': 'Lien', 'f.icon': 'Icône', 'f.chooseIcon': 'Choisir une icône',
  'f.searchIcons': 'Rechercher (instagram, whatsapp…)', 'f.uploadIcon': 'Importer votre icône', 'f.noIcon': 'Sans icône', 'f.addLink': 'Ajouter un lien', 'f.addSocial': 'Ajouter un compte',
  'f.numbers': 'Numéros', 'f.number': 'Numéro de téléphone', 'f.numberLabel': 'Nom (optionnel)', 'f.addNumber': 'Ajouter un numéro', 'f.phoneHint': 'Avec plusieurs numéros, le visiteur choisit lequel appeler.',
  'f.firstName': 'Prénom', 'f.lastName': 'Nom', 'f.org': 'Entreprise', 'f.jobTitle': 'Fonction', 'f.email': 'E-mail', 'f.website': 'Site web',
  'f.address': 'Adresse', 'f.note': 'Note', 'f.vcardHint': 'Le visiteur touche le bouton et la fiche s’ouvre dans l’app Contacts de son téléphone.',
  'f.heading': 'Titre (optionnel)', 'f.embedUrl': 'Collez un lien', 'f.addEmbed': 'Ajouter une vidéo ou publication', 'f.unsupported': 'Ce lien n’est pas pris en charge',
  'f.images': 'Images', 'f.addImage': 'Ajouter une image', 'f.upload': 'Importer une image', 'f.uploading': 'Import…', 'f.uploadHint': 'PNG, JPG, WebP, GIF ou SVG. Les grandes photos sont réduites',
  'f.tooLarge': 'L’image dépasse 5 Mo.', 'f.badType': 'Utilisez une image PNG, JPG, WebP, GIF ou SVG. Les photos HEIC de l’iPhone ne marchent pas.', 'f.tooMany': 'Limite d’import atteinte.', 'f.uploadFailed': 'Échec de l’import.',
  'f.moveUp': 'Monter', 'f.moveDown': 'Descendre', 'f.altText': 'Description de l’image',
  'd.font': 'Police', 'd.colors': 'Couleurs', 'd.textColor': 'Texte', 'd.accent': 'Accent', 'd.background': 'Arrière-plan',
  'd.bgColor': 'Couleur', 'd.bgGradient': 'Dégradé', 'd.bgImage': 'Image', 'd.color1': 'Couleur du haut', 'd.color2': 'Couleur du bas',
  'd.overlay': 'Couleur du voile', 'd.overlayOpacity': 'Intensité du voile', 'd.buttons': 'Boutons', 'd.btnSolid': 'Plein', 'd.btnOutline': 'Contour', 'd.btnGlass': 'Verre',
  'd.btnColor': 'Couleur des boutons', 'd.btnText': 'Texte des boutons', 'd.glassOpacity': 'Opacité du verre', 'd.glassBlur': 'Flou du verre', 'd.glassHint': 'L’effet verre rend mieux sur une image ou un dégradé.',
  'd.corners': 'Coins', 'd.shadow': 'Ombre', 'd.textShadow': 'Ombre du texte', 'd.textShadowHint': 'Garde le nom lisible sur un fond chargé.',
  'd.avatarGlow': 'Halo du logo', 'd.glowLogo': 'Couleurs du logo', 'd.glowColor': 'Couleur du halo', 'd.glowStrength': 'Intensité du halo', 'd.glowAll': 'Halo partout', 'd.glowAllHint': 'Le même halo sur les boutons, les icônes et le nom.', 'd.glassPanel': 'Panneau verre derrière les liens', 'd.glassPanelHint': 'Place les boutons sur une seule carte dépolie.', 'd.avatarGlowHint': 'Un halo flou derrière le logo.',
  'd.direction': 'Sens du texte', 'd.ltr': 'Gauche à droite', 'd.rtl': 'Droite à gauche', 'd.mode': 'Thème du navigateur', 'd.light': 'Clair', 'd.dark': 'Sombre',
  'd.none': 'Aucune', 'd.small': 'Petite', 'd.medium': 'Moyenne', 'd.large': 'Grande', 'd.round': 'Arrondis',
  's.title': 'Titre de la page', 's.seoTitle': 'Titre dans les résultats de recherche', 's.seoDesc': 'Description dans les résultats de recherche', 's.favicon': 'Icône de l’onglet',
  'st.views': 'Vues', 'st.clicks': 'Clics', 'st.range7': '7 jours', 'st.range30': '30 jours', 'st.rangeAll': 'Tout',
  'st.perDay': 'Vues par jour', 'st.byItem': 'Clics par bouton', 'st.noData': 'Aucune visite sur cette période.', 'st.removed': 'Élément supprimé',
  'st.kind.links': 'Lien', 'st.kind.socials': 'Réseau', 'st.kind.embed': 'Vidéo', 'st.kind.phone': 'Téléphone', 'st.kind.vcard': 'Contact', 'st.kind.removed': 'Supprimé',
  'acct.title': 'Paramètres du compte', 'acct.changePw': 'Changer le mot de passe', 'acct.changePwHint': 'Au moins 8 caractères. Vos autres appareils seront déconnectés.',
  'acct.currentPw': 'Mot de passe actuel', 'acct.newPw': 'Nouveau mot de passe', 'acct.updatePw': 'Mettre à jour', 'acct.pwSaved': 'Mot de passe mis à jour.', 'acct.pwError': 'Impossible de changer le mot de passe.',
  
  
}

const ar: Record<string, string> = {
  'common.save': 'حفظ', 'common.saving': 'جارٍ الحفظ…', 'common.saved': 'تم الحفظ', 'common.saveError': 'لم يتم الحفظ، حاول مجددًا', 'ed.adminOnly': 'المشرف فقط يمكنه تعديل هذا القسم',
  'common.cancel': 'إلغاء', 'common.delete': 'حذف', 'common.remove': 'إزالة', 'common.add': 'إضافة',
  'common.error': 'حدث خطأ ما.', 'common.retry': 'إعادة المحاولة', 'common.reconnecting': 'جارٍ إعادة الاتصال…',
  'nav.home': 'الرئيسية', 'nav.account': 'إعدادات الحساب', 'nav.signout': 'تسجيل الخروج', 'nav.lang': 'اللغة', 'nav.theme': 'فاتح أو داكن', 'nav.menu': 'قائمة الحساب',
  'auth.title': 'تسجيل الدخول', 'auth.subtitle': 'استخدم البريد الإلكتروني وكلمة المرور اللذين تسلّمتهما.', 'auth.email': 'البريد الإلكتروني', 'auth.password': 'كلمة المرور',
  'auth.signin': 'دخول', 'auth.wait': 'يرجى الانتظار…', 'auth.error': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
  
  'dash.title': 'الصفحات', 'dash.subtitle': 'كل صفحات المنصة. أنشئ الحسابات من لوحة الإدارة.',
  'dash.empty': 'لا توجد صفحات بعد. أنشئ حسابًا من لوحة الإدارة أولًا.', 'dash.noPage': 'صفحتك ليست جاهزة بعد. تواصل مع المسؤول.',
  'dash.edit': 'تعديل', 'dash.view': 'عرض', 'dash.published': 'منشورة', 'dash.draft': 'مسودة', 'dash.owner': 'المالك',
  'ed.back': 'الصفحات', 'ed.publish': 'نشر', 'ed.update': 'تحديث الصفحة', 'ed.publishing': 'جارٍ النشر…', 'ed.viewLive': 'عرض الصفحة',
  'ed.tabContent': 'المحتوى', 'ed.tabDesign': 'التصميم', 'ed.tabSettings': 'الإعدادات', 'ed.tabStats': 'الإحصائيات',
  'ed.addBlock': 'إضافة قسم', 'ed.pickBlock': 'اختر قسمًا', 'ed.confirmDel': 'حذف هذا القسم؟', 'ed.confirmDelDesc': 'سيُحذف محتواه نهائيًا.',
  'ed.hide': 'إخفاء من الصفحة', 'ed.show': 'إظهار في الصفحة', 'ed.drag': 'اسحب لإعادة الترتيب', 'ed.edit': 'تعديل', 'ed.preview': 'معاينة',
  'ed.noBlocks': 'لا توجد أقسام بعد.', 'ed.userHint': 'عدّل أزرارك وأيقوناتك وأرقامك. تظهر التغييرات في صفحتك تلقائيًا.',
  'ed.adminHint': 'تبقى التعديلات مسودة حتى تنشرها.', 'ed.previewTitle': 'معاينة الصفحة',
  'b.profile': 'الملف الشخصي', 'b.links': 'الروابط', 'b.socials': 'أيقونات التواصل', 'b.phone': 'زر الهاتف', 'b.vcard': 'حفظ جهة الاتصال', 'b.embed': 'فيديوهات ومنشورات', 'b.gallery': 'معرض الصور',
  'bd.profile': 'الصورة والاسم والنبذة', 'bd.links': 'أزرار مع أيقونات', 'bd.socials': 'أيقونات دائرية لحساباتك', 'bd.phone': 'زر واحد لعدة أرقام',
  'bd.vcard': 'يضيفك إلى جهات اتصال الهاتف', 'bd.embed': 'يوتيوب، شورتس، تيك توك، إنستغرام، X، فيسبوك', 'bd.gallery': 'شبكة صور',
  'f.name': 'الاسم', 'f.bio': 'النبذة', 'f.photo': 'الصورة', 'f.label': 'نص الزر', 'f.url': 'الرابط', 'f.icon': 'الأيقونة', 'f.chooseIcon': 'اختر أيقونة',
  'f.searchIcons': 'ابحث عن أيقونة (instagram، whatsapp…)', 'f.uploadIcon': 'ارفع أيقونتك', 'f.noIcon': 'بدون أيقونة', 'f.addLink': 'إضافة رابط', 'f.addSocial': 'إضافة حساب',
  'f.numbers': 'الأرقام', 'f.number': 'رقم الهاتف', 'f.numberLabel': 'الاسم (اختياري)', 'f.addNumber': 'إضافة رقم', 'f.phoneHint': 'عند وجود عدة أرقام يختار الزائر الرقم الذي يتصل به.',
  'f.firstName': 'الاسم', 'f.lastName': 'اللقب', 'f.org': 'الشركة', 'f.jobTitle': 'المسمى الوظيفي', 'f.email': 'البريد الإلكتروني', 'f.website': 'الموقع',
  'f.address': 'العنوان', 'f.note': 'ملاحظة', 'f.vcardHint': 'يضغط الزائر على الزر فتُفتح بطاقة الاتصال في تطبيق جهات الاتصال بهاتفه.',
  'f.heading': 'العنوان (اختياري)', 'f.embedUrl': 'الصق رابطًا', 'f.addEmbed': 'إضافة فيديو أو منشور', 'f.unsupported': 'هذا الرابط غير مدعوم',
  'f.images': 'الصور', 'f.addImage': 'إضافة صورة', 'f.upload': 'رفع صورة', 'f.uploading': 'جارٍ الرفع…', 'f.uploadHint': 'PNG أو JPG أو WebP أو GIF أو SVG. الصور الكبيرة يتم تصغيرها',
  'f.tooLarge': 'حجم الصورة أكبر من 5 ميغابايت.', 'f.badType': 'استخدم صورة PNG أو JPG أو WebP أو GIF أو SVG. صور HEIC من الآيفون لا تعمل.', 'f.tooMany': 'تم بلوغ حد الرفع.', 'f.uploadFailed': 'فشل الرفع.',
  'f.moveUp': 'تحريك للأعلى', 'f.moveDown': 'تحريك للأسفل', 'f.altText': 'وصف الصورة',
  'd.font': 'الخط', 'd.colors': 'الألوان', 'd.textColor': 'النص', 'd.accent': 'اللون المميز', 'd.background': 'الخلفية',
  'd.bgColor': 'لون', 'd.bgGradient': 'تدرّج', 'd.bgImage': 'صورة', 'd.color1': 'اللون العلوي', 'd.color2': 'اللون السفلي',
  'd.overlay': 'لون الطبقة', 'd.overlayOpacity': 'قوة الطبقة', 'd.buttons': 'الأزرار', 'd.btnSolid': 'ممتلئ', 'd.btnOutline': 'إطار', 'd.btnGlass': 'زجاجي',
  'd.btnColor': 'لون الأزرار', 'd.btnText': 'نص الأزرار', 'd.glassOpacity': 'شفافية الزجاج', 'd.glassBlur': 'ضبابية الزجاج', 'd.glassHint': 'يظهر التأثير الزجاجي أفضل فوق صورة أو تدرّج.',
  'd.corners': 'الزوايا', 'd.shadow': 'الظل', 'd.textShadow': 'ظل النص', 'd.textShadowHint': 'يُبقي الاسم واضحًا فوق الخلفيات المزدحمة.',
  'd.avatarGlow': 'توهج الشعار', 'd.glowLogo': 'ألوان الشعار', 'd.glowColor': 'لون التوهج', 'd.glowStrength': 'قوة التوهج', 'd.glowAll': 'توهج في كل شيء', 'd.glowAllHint': 'نفس الهالة على الأزرار والأيقونات والاسم.', 'd.glassPanel': 'لوح زجاجي خلف الروابط', 'd.glassPanelHint': 'يضع أزرار الروابط على بطاقة زجاجية واحدة.', 'd.avatarGlowHint': 'هالة ضبابية خلف الشعار.',
  'd.direction': 'اتجاه النص', 'd.ltr': 'من اليسار إلى اليمين', 'd.rtl': 'من اليمين إلى اليسار', 'd.mode': 'سمة المتصفح', 'd.light': 'فاتح', 'd.dark': 'داكن',
  'd.none': 'بدون', 'd.small': 'صغير', 'd.medium': 'متوسط', 'd.large': 'كبير', 'd.round': 'دائري',
  's.title': 'عنوان الصفحة', 's.seoTitle': 'العنوان في نتائج البحث', 's.seoDesc': 'الوصف في نتائج البحث', 's.favicon': 'أيقونة التبويب',
  'st.views': 'المشاهدات', 'st.clicks': 'النقرات', 'st.range7': '7 أيام', 'st.range30': '30 يومًا', 'st.rangeAll': 'كل الوقت',
  'st.perDay': 'المشاهدات يوميًا', 'st.byItem': 'النقرات لكل زر', 'st.noData': 'لا توجد زيارات في هذه الفترة.', 'st.removed': 'عنصر محذوف',
  'st.kind.links': 'رابط', 'st.kind.socials': 'حساب', 'st.kind.embed': 'فيديو', 'st.kind.phone': 'هاتف', 'st.kind.vcard': 'جهة اتصال', 'st.kind.removed': 'محذوف',
  'acct.title': 'إعدادات الحساب', 'acct.changePw': 'تغيير كلمة المرور', 'acct.changePwHint': '8 أحرف على الأقل. سيتم تسجيل خروج أجهزتك الأخرى.',
  'acct.currentPw': 'كلمة المرور الحالية', 'acct.newPw': 'كلمة المرور الجديدة', 'acct.updatePw': 'تحديث كلمة المرور', 'acct.pwSaved': 'تم تحديث كلمة المرور.', 'acct.pwError': 'تعذّر تحديث كلمة المرور.',
  
  
}

const DICTS: Record<Lang, Record<string, string>> = { en, fr, ar }

function detect(): Lang {
  try {
    const saved = localStorage.getItem(KEY) as Lang | null
    if (saved && DICTS[saved]) return saved
  } catch { /* storage blocked: fall back to the browser language */ }
  const nav = navigator.language.slice(0, 2)
  return nav === 'fr' ? 'fr' : nav === 'ar' ? 'ar' : 'en'
}

const I18nCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string }>({
  lang: 'en', setLang: () => {}, t: (k) => k,
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detect)
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = dirOf(lang)
  }, [lang])
  const setLang = (l: Lang) => {
    try { localStorage.setItem(KEY, l) } catch { /* not remembered in private mode */ }
    setLangState(l)
  }
  const t = (k: string) => DICTS[lang][k] ?? en[k] ?? k
  return (
    <I18nCtx.Provider value={{ lang, setLang, t }}>
      <Direction.Provider dir={dirOf(lang)}>{children}</Direction.Provider>
    </I18nCtx.Provider>
  )
}

export const useT = () => useContext(I18nCtx)

export function LangSwitcher() {
  const { lang, setLang, t } = useT()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('nav.lang')} title={t('nav.lang')}><Languages /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={lang} onValueChange={(v) => setLang(v as Lang)}>
          {LANGS.map((l) => <DropdownMenuRadioItem key={l.id} value={l.id}>{l.name}</DropdownMenuRadioItem>)}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
