import en from './locales/en.json';
import bn from './locales/bn.json';

export type Language = 'en' | 'bn';

const translations = {
    en,
    bn
};

export const t = (lang: Language, key: string, options?: { [key: string]: string | number }): string => {
    const keyParts = key.split('.');
    let translation: any = translations[lang];

    try {
        for (const part of keyParts) {
            if (translation[part] === undefined) {
                // Fallback to English if translation is missing
                translation = translations['en'];
                for (const enPart of keyParts) {
                    translation = translation[enPart];
                }
                if(translation === undefined) throw new Error();
                break;
            }
            translation = translation[part];
        }
    } catch (e) {
        // console.warn(`Translation key not found: ${key}`);
        return key; // Return the key itself if not found in either language
    }
    
    let text: string = translation; 

    if (options) {
        text = text.replace(/\{\{(\w+)\}\}/g, (_: any, placeholder: string) => {
            return options[placeholder] !== undefined ? String(options[placeholder]) : `{{${placeholder}}}`;
        });
    }

    return text;
};
