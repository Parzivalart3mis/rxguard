// Clinical guidelines for antibiotic selection by condition

export const guidelines = {
  conditions: {
    strep_pharyngitis: {
      name: "Streptococcal Pharyngitis",
      firstLine: ["amoxicillin", "penicillin"],
      alternatives: ["azithromycin"],
      typicalPathogens: ["GAS (Group A Strep)"],
      duration: "10 days",
      notes: "Confirm with rapid strep test or culture. Antibiotics reduce symptom duration by ~16 hours and prevent rheumatic fever."
    },
    uncomplicated_uti: {
      name: "Uncomplicated Cystitis (UTI)",
      firstLine: ["nitrofurantoin", "tmp_smx"],
      alternatives: ["fosfomycin"],
      typicalPathogens: ["E. coli"],
      duration: "3-5 days",
      notes: "Avoid fluoroquinolones as first-line due to resistance concerns."
    },
    complicated_uti: {
      name: "Complicated UTI or Recurrent Infection",
      firstLine: ["nitrofurantoin"],
      alternatives: ["ciprofloxacin", "levofloxacin"],
      typicalPathogens: ["E. coli", "other gram-negatives"],
      duration: "7-14 days",
      notes: "Consider culture-guided therapy. Avoid TMP-SMX if used recently."
    },
    community_acquired_pneumonia: {
      name: "Community-Acquired Pneumonia (Outpatient)",
      firstLine: ["amoxicillin"],
      alternatives: ["doxycycline", "azithromycin"],
      typicalPathogens: ["S. pneumoniae", "M. catarrhalis", "H. influenzae"],
      duration: "5-7 days",
      notes: "Use azithromycin only if atypical coverage needed or severe penicillin allergy."
    },
    acute_otitis_media: {
      name: "Acute Otitis Media",
      firstLine: ["amoxicillin"],
      alternatives: ["amoxicillin_clav"],
      typicalPathogens: ["S. pneumoniae", "H. influenzae", "M. catarrhalis"],
      duration: "10 days",
      notes: "Consider observation for mild cases in older children."
    },
    acute_sinusitis: {
      name: "Acute Bacterial Sinusitis",
      firstLine: ["amoxicillin_clav"],
      alternatives: ["doxycycline"],
      typicalPathogens: ["S. pneumoniae", "H. influenzae", "M. catarrhalis"],
      duration: "5-10 days",
      notes: "Only treat if bacterial criteria met (symptoms >10 days or severe onset)."
    },
    cellulitis: {
      name: "Cellulitis",
      firstLine: ["cephalexin", "dicloxacillin"],
      alternatives: ["clindamycin", "tmp_smx"],
      typicalPathogens: ["S. aureus (MSSA)", "Streptococcus pyogenes"],
      duration: "7-10 days",
      notes: "TMP-SMX alone lacks streptococcal coverage. Consider MRSA risk factors."
    },
    viral_uri: {
      name: "Upper Respiratory Infection (Viral)",
      firstLine: [],
      alternatives: [],
      typicalPathogens: ["Rhinovirus", "Influenza", "RSV"],
      duration: "N/A",
      notes: "Antibiotics NOT recommended. Symptomatic care only."
    },
    viral_sinusitis: {
      name: "Viral Sinusitis",
      firstLine: [],
      alternatives: [],
      typicalPathogens: ["Viral"],
      duration: "N/A",
      notes: "Watchful waiting. Most resolve spontaneously in 7-10 days."
    },
    viral_pharyngitis: {
      name: "Viral Pharyngitis",
      firstLine: [],
      alternatives: [],
      typicalPathogens: ["Viral"],
      duration: "N/A",
      notes: "Antibiotics NOT recommended. Supportive care only."
    },
    general_infection: {
      name: "Infection (condition-specific algorithm unavailable)",
      firstLine: ["amoxicillin_clav"],
      alternatives: ["doxycycline", "azithromycin", "ciprofloxacin"],
      typicalPathogens: ["S. aureus", "S. pneumoniae", "E. coli", "H. influenzae"],
      duration: "5-7 days (adjust based on clinical response)",
      notes: "No specific algorithm matched this condition. Empiric broad-spectrum options shown — tailor therapy once culture and sensitivity results are available. Clinical judgment is essential."
    }
  },

  // Scoring thresholds
  thresholds: {
    centor: {
      0: { probability: 5, recommendation: "No testing or antibiotics" },
      1: { probability: 10, recommendation: "No testing or antibiotics" },
      2: { probability: 25, recommendation: "Consider rapid strep test" },
      3: { probability: 35, recommendation: "Consider rapid strep test" },
      4: { probability: 55, recommendation: "Antibiotics may be appropriate" },
      5: { probability: 65, recommendation: "Antibiotics may be appropriate" }
    },
    bacterial_probability: {
      low: { max: 25, color: "green", label: "Low bacterial probability" },
      uncertain: { min: 25, max: 50, color: "yellow", label: "Uncertain - consider testing" },
      moderate: { min: 50, max: 75, color: "orange", label: "Moderate probability - antibiotic may be warranted" },
      high: { min: 75, max: 100, color: "red", label: "High bacterial probability - treat" }
    }
  },

  // Spectrum categories
  spectrumCategories: {
    narrow: {
      description: "Narrow-spectrum antibiotics target specific pathogens",
      antibiotics: ["penicillin", "amoxicillin", "nitrofurantoin", "cephalexin", "dicloxacillin", "fosfomycin"],
      stewardshipScore: "preferred"
    },
    medium: {
      description: "Medium-spectrum antibiotics cover common community pathogens",
      antibiotics: ["amoxicillin_clav", "tmp_smx", "clindamycin", "doxycycline"],
      stewardshipScore: "acceptable"
    },
    broad: {
      description: "Broad-spectrum antibiotics cover atypical or resistant organisms",
      antibiotics: ["azithromycin", "ciprofloxacin", "levofloxacin"],
      stewardshipScore: "reserve"
    },
    very_broad: {
      description: "Reserved for severe/complicated infections",
      antibiotics: ["piperacillin_tazobactam", "carbapenems", "vancomycin"],
      stewardshipScore: "restricted"
    }
  }
};

export default guidelines;
