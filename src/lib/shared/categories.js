export const CRNATA_URLS = {
    "tir18m": "/evenements/categories/tir-a-18m/",
    "tae_50_70": "/evenements/categories/tae_50_70/",
    "campagne": "/evenements/categories/tir_campagne",
    "nature": "/evenements/categories/nature",
    "tir3d": "/evenements/categories/tir_3d",
};

export const CATEGORIES = [
    { slug: "tir18m", label: "Tir à 18m", subtitle: "Compétitions en salle", emoji: "🎯", disabled: false },
    { slug: "tae_50_70", label: "Tir extérieur (à venir)", subtitle: "50/70m plein air", emoji: "☀️", disabled : true },
    { slug: "campagne", label: "Tir campagne (à venir)", subtitle: "Tir en campagne", emoji: "🌲", disabled : true },
    { slug: "nature", label: "Nature (à venir)", subtitle: "Parcours nature plein air", emoji: "🦌", disabled : true },
    { slug: "tir3d", label: "Tir 3D (à venir)", subtitle: "Parcours 3D", emoji: "🦉", disabled : true },
]
