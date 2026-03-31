export type DistrictMapItem = {
  city: string;
  district: string;
  districtId: number;
};

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .trim();
}

export const DISTRICT_MAP: DistrictMapItem[] = [
  { city: "Samsun", district: "Atakum", districtId: 2072 },
  { city: "Samsun", district: "İlkadım", districtId: 2072 },
  { city: "Samsun", district: "Canik", districtId: 2072 },
  { city: "Samsun", district: "Tekkeköy", districtId: 2072 },
  { city: "Samsun", district: "Çarşamba", districtId: 2072 },
  { city: "Samsun", district: "Bafra", districtId: 2072 },
  { city: "Samsun", district: "Alaçam", districtId: 2072 },
  { city: "Samsun", district: "Terme", districtId: 2072 },
  { city: "Samsun", district: "19 Mayıs", districtId: 2072 },

  { city: "Ordu", district: "Fatsa", districtId: 1234 },
  { city: "Ordu", district: "Ünye", districtId: 1234 },
  { city: "Ordu", district: "Altınordu", districtId: 1234 },
];

export function findDistrictId(
  city?: string,
  district?: string
): number | null {
  if (!city || !district) return null;

  const normalizedCity = normalizeText(city);
  const normalizedDistrict = normalizeText(district);

  const found = DISTRICT_MAP.find(
    (item) =>
      normalizeText(item.city) === normalizedCity &&
      normalizeText(item.district) === normalizedDistrict
  );

  return found ? found.districtId : null;
}