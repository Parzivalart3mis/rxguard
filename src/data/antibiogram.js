// Antibiogram data with local resistance rates

export const antibiogram = {
  facility: "Metro General Hospital",
  year: 2025,
  data: [
    {
      pathogen: "E. coli",
      antibiotics: {
        nitrofurantoin: { susceptibility: 97, resistance: 3, trend: "stable" },
        tmp_smx: { susceptibility: 72, resistance: 28, trend: "declining" },
        ciprofloxacin: { susceptibility: 76, resistance: 24, trend: "declining" },
        amoxicillin_clav: { susceptibility: 85, resistance: 15, trend: "stable" },
        ceftriaxone: { susceptibility: 94, resistance: 6, trend: "stable" }
      }
    },
    {
      pathogen: "S. pneumoniae",
      antibiotics: {
        amoxicillin: { susceptibility: 96, resistance: 4, trend: "stable" },
        azithromycin: { susceptibility: 62, resistance: 38, trend: "declining" },
        doxycycline: { susceptibility: 88, resistance: 12, trend: "stable" },
        levofloxacin: { susceptibility: 99, resistance: 1, trend: "stable" }
      }
    },
    {
      pathogen: "GAS (Group A Strep)",
      antibiotics: {
        penicillin: { susceptibility: 100, resistance: 0, trend: "stable" },
        amoxicillin: { susceptibility: 100, resistance: 0, trend: "stable" },
        azithromycin: { susceptibility: 85, resistance: 15, trend: "declining" }
      }
    },
    {
      pathogen: "S. aureus (MSSA)",
      antibiotics: {
        cephalexin: { susceptibility: 95, resistance: 5, trend: "stable" },
        dicloxacillin: { susceptibility: 96, resistance: 4, trend: "stable" },
        tmp_smx: { susceptibility: 94, resistance: 6, trend: "stable" },
        clindamycin: { susceptibility: 80, resistance: 20, trend: "declining" }
      }
    },
    {
      pathogen: "H. influenzae",
      antibiotics: {
        amoxicillin: { susceptibility: 65, resistance: 35, trend: "declining" },
        amoxicillin_clav: { susceptibility: 92, resistance: 8, trend: "stable" },
        azithromycin: { susceptibility: 98, resistance: 2, trend: "stable" }
      }
    },
    {
      pathogen: "M. catarrhalis",
      antibiotics: {
        amoxicillin_clav: { susceptibility: 95, resistance: 5, trend: "stable" },
        azithromycin: { susceptibility: 99, resistance: 1, trend: "stable" },
        doxycycline: { susceptibility: 94, resistance: 6, trend: "stable" }
      }
    }
  ],
  historicalResistance: {
    ciprofloxacin_ecoli: [
      { year: 2021, resistance: 12 },
      { year: 2022, resistance: 16 },
      { year: 2023, resistance: 19 },
      { year: 2024, resistance: 22 },
      { year: 2025, resistance: 24 }
    ],
    azithromycin_spneumo: [
      { year: 2021, resistance: 28 },
      { year: 2022, resistance: 31 },
      { year: 2023, resistance: 34 },
      { year: 2024, resistance: 36 },
      { year: 2025, resistance: 38 }
    ],
    tmp_smx_ecoli: [
      { year: 2021, resistance: 22 },
      { year: 2022, resistance: 24 },
      { year: 2023, resistance: 25 },
      { year: 2024, resistance: 27 },
      { year: 2025, resistance: 28 }
    ],
    ciprofloxacin_saureus: [
      { year: 2021, resistance: 18 },
      { year: 2022, resistance: 22 },
      { year: 2023, resistance: 26 },
      { year: 2024, resistance: 29 },
      { year: 2025, resistance: 32 }
    ]
  }
};

// Antibiotic metadata including spectrum, dosing, and cross-reactivity
export const antibioticMetadata = {
  amoxicillin: {
    name: "Amoxicillin",
    spectrum: "narrow",
    spectrumRank: 1,
    typicalDose: "500mg PO TID x 7-10 days",
    crossReactivity: ["penicillin", "amoxicillin_clav"],
    firstLineFor: ["strep_pharyngitis", "otitis_media", "pneumonia_outpatient"],
    renalAdjustment: true
  },
  penicillin: {
    name: "Penicillin V",
    spectrum: "narrow",
    spectrumRank: 1,
    typicalDose: "500mg PO QID x 10 days",
    crossReactivity: ["amoxicillin", "amoxicillin_clav"],
    firstLineFor: ["strep_pharyngitis"],
    renalAdjustment: false
  },
  amoxicillin_clav: {
    name: "Amoxicillin-Clavulanate",
    spectrum: "broad",
    spectrumRank: 3,
    typicalDose: "875/125mg PO BID x 7-10 days",
    crossReactivity: ["penicillin", "amoxicillin"],
    firstLineFor: ["acute_sinusitis", "otitis_media", "animal_bite"],
    renalAdjustment: true
  },
  azithromycin: {
    name: "Azithromycin",
    spectrum: "broad",
    spectrumRank: 4,
    typicalDose: "500mg PO day 1, then 250mg daily x 4 days",
    crossReactivity: ["clarithromycin", "erythromycin"],
    firstLineFor: ["strep_pharyngitis_allergy", "atypical_pneumonia"],
    renalAdjustment: false
  },
  doxycycline: {
    name: "Doxycycline",
    spectrum: "medium",
    spectrumRank: 2,
    typicalDose: "100mg PO BID x 7-10 days",
    crossReactivity: ["tetracyclines"],
    firstLineFor: ["pneumonia_outpatient"],
    renalAdjustment: false
  },
  nitrofurantoin: {
    name: "Nitrofurantoin",
    spectrum: "narrow",
    spectrumRank: 1,
    typicalDose: "100mg PO BID x 5 days (UTI only)",
    crossReactivity: [],
    firstLineFor: ["uncomplicated_uti"],
    renalAdjustment: true
  },
  tmp_smx: {
    name: "TMP-SMX (Bactrim)",
    spectrum: "medium",
    spectrumRank: 2,
    typicalDose: "DS 1 tab PO BID x 3 days (UTI)",
    crossReactivity: ["sulfa"],
    firstLineFor: ["uncomplicated_uti", "skin_infection"],
    renalAdjustment: true
  },
  ciprofloxacin: {
    name: "Ciprofloxacin",
    spectrum: "broad",
    spectrumRank: 4,
    typicalDose: "250-500mg PO BID x 7-14 days",
    crossReactivity: ["fluoroquinolones"],
    firstLineFor: [],
    renalAdjustment: true
  },
  levofloxacin: {
    name: "Levofloxacin",
    spectrum: "broad",
    spectrumRank: 4,
    typicalDose: "500-750mg PO daily x 7-14 days",
    crossReactivity: ["fluoroquinolones"],
    firstLineFor: ["complicated_pneumonia"],
    renalAdjustment: true
  },
  cephalexin: {
    name: "Cephalexin",
    spectrum: "narrow",
    spectrumRank: 1,
    typicalDose: "500mg PO QID x 7-10 days",
    crossReactivity: ["cephalosporins"],
    firstLineFor: ["cellulitis", "skin_infection"],
    renalAdjustment: true
  },
  dicloxacillin: {
    name: "Dicloxacillin",
    spectrum: "narrow",
    spectrumRank: 1,
    typicalDose: "500mg PO QID x 7-10 days",
    crossReactivity: ["penicillins", "cephalosporins"],
    firstLineFor: ["cellulitis", "skin_infection"],
    renalAdjustment: true
  },
  clindamycin: {
    name: "Clindamycin",
    spectrum: "medium",
    spectrumRank: 2,
    typicalDose: "300mg PO QID x 7-10 days",
    crossReactivity: [],
    firstLineFor: ["cellulitis_penicillin_allergy"],
    renalAdjustment: true
  },
  fosfomycin: {
    name: "Fosfomycin",
    spectrum: "narrow",
    spectrumRank: 1,
    typicalDose: "3g PO single dose",
    crossReactivity: [],
    firstLineFor: ["uncomplicated_uti"],
    renalAdjustment: false
  }
};

export default antibiogram;
