// Mock prescribing history for dashboard analytics

export const prescribingHistory = [
  { date: "2026-03-15", patientId: "15", condition: "strep_pharyngitis", antibiotic: "amoxicillin", bacterialProbability: 55, spectrumCategory: "narrow", followedRecommendation: true, overrideReason: null },
  { date: "2026-03-14", patientId: "22", condition: "uncomplicated_uti", antibiotic: "nitrofurantoin", bacterialProbability: 85, spectrumCategory: "narrow", followedRecommendation: true, overrideReason: null },
  { date: "2026-03-12", patientId: "31", condition: "viral_uri", antibiotic: "azithromycin", bacterialProbability: 15, spectrumCategory: "broad", followedRecommendation: false, overrideReason: "Patient preference" },
  { date: "2026-03-10", patientId: "8", condition: "acute_otitis_media", antibiotic: "amoxicillin", bacterialProbability: 80, spectrumCategory: "narrow", followedRecommendation: true, overrideReason: null },
  { date: "2026-03-08", patientId: "45", condition: "cellulitis", antibiotic: "cephalexin", bacterialProbability: 75, spectrumCategory: "narrow", followedRecommendation: true, overrideReason: null },
  { date: "2026-03-06", patientId: "19", condition: "uncomplicated_uti", antibiotic: "ciprofloxacin", bacterialProbability: 70, spectrumCategory: "broad", followedRecommendation: false, overrideReason: "Prior treatment failure" },
  { date: "2026-03-05", patientId: "28", condition: "community_acquired_pneumonia", antibiotic: "amoxicillin", bacterialProbability: 78, spectrumCategory: "narrow", followedRecommendation: true, overrideReason: null },
  { date: "2026-03-03", patientId: "12", condition: "viral_pharyngitis", antibiotic: "amoxicillin", bacterialProbability: 10, spectrumCategory: "narrow", followedRecommendation: false, overrideReason: "Clinical judgment" },
  { date: "2026-03-01", patientId: "37", condition: "strep_pharyngitis", antibiotic: "amoxicillin", bacterialProbability: 60, spectrumCategory: "narrow", followedRecommendation: true, overrideReason: null },
  { date: "2026-02-28", patientId: "44", condition: "uncomplicated_uti", antibiotic: "tmp_smx", bacterialProbability: 75, spectrumCategory: "medium", followedRecommendation: true, overrideReason: null },
  { date: "2026-02-25", patientId: "9", condition: "cellulitis", antibiotic: "clindamycin", bacterialProbability: 70, spectrumCategory: "medium", followedRecommendation: true, overrideReason: null },
  { date: "2026-02-24", patientId: "23", condition: "viral_uri", antibiotic: "amoxicillin_clav", bacterialProbability: 20, spectrumCategory: "broad", followedRecommendation: false, overrideReason: "Patient demand" },
  { date: "2026-02-22", patientId: "51", condition: "acute_sinusitis", antibiotic: "amoxicillin_clav", bacterialProbability: 65, spectrumCategory: "broad", followedRecommendation: true, overrideReason: null },
  { date: "2026-02-20", patientId: "7", condition: "complicated_uti", antibiotic: "tmp_smx", bacterialProbability: 80, spectrumCategory: "medium", followedRecommendation: false, overrideReason: "Prior culture results" },
  { date: "2026-02-18", patientId: "16", condition: "community_acquired_pneumonia", antibiotic: "doxycycline", bacterialProbability: 70, spectrumCategory: "medium", followedRecommendation: true, overrideReason: null },
  { date: "2026-02-15", patientId: "29", condition: "uncomplicated_uti", antibiotic: "nitrofurantoin", bacterialProbability: 82, spectrumCategory: "narrow", followedRecommendation: true, overrideReason: null },
  { date: "2026-02-14", patientId: "33", condition: "viral_sinusitis", antibiotic: "azithromycin", bacterialProbability: 18, spectrumCategory: "broad", followedRecommendation: false, overrideReason: "Clinical judgment" },
  { date: "2026-02-12", patientId: "41", condition: "strep_pharyngitis", antibiotic: "penicillin", bacterialProbability: 55, spectrumCategory: "narrow", followedRecommendation: true, overrideReason: null },
  { date: "2026-02-10", patientId: "18", condition: "cellulitis", antibiotic: "cephalexin", bacterialProbability: 72, spectrumCategory: "narrow", followedRecommendation: true, overrideReason: null },
  { date: "2026-02-08", patientId: "27", condition: "acute_otitis_media", antibiotic: "amoxicillin", bacterialProbability: 85, spectrumCategory: "narrow", followedRecommendation: true, overrideReason: null },
  { date: "2026-02-06", patientId: "5", condition: "viral_uri", antibiotic: "doxycycline", bacterialProbability: 12, spectrumCategory: "medium", followedRecommendation: false, overrideReason: "Patient preference" },
  { date: "2026-02-04", patientId: "36", condition: "uncomplicated_uti", antibiotic: "ciprofloxacin", bacterialProbability: 68, spectrumCategory: "broad", followedRecommendation: false, overrideReason: "Comorbidities" },
  { date: "2026-02-02", patientId: "14", condition: "community_acquired_pneumonia", antibiotic: "amoxicillin", bacterialProbability: 82, spectrumCategory: "narrow", followedRecommendation: true, overrideReason: null },
  { date: "2026-01-30", patientId: "49", condition: "strep_pharyngitis", antibiotic: "amoxicillin", bacterialProbability: 50, spectrumCategory: "narrow", followedRecommendation: true, overrideReason: null },
  { date: "2026-01-28", patientId: "21", condition: "uncomplicated_uti", antibiotic: "nitrofurantoin", bacterialProbability: 88, spectrumCategory: "narrow", followedRecommendation: true, overrideReason: null },
  { date: "2026-01-26", patientId: "11", condition: "cellulitis", antibiotic: "dicloxacillin", bacterialProbability: 78, spectrumCategory: "narrow", followedRecommendation: true, overrideReason: null },
  { date: "2026-01-24", patientId: "30", condition: "acute_sinusitis", antibiotic: "amoxicillin_clav", bacterialProbability: 70, spectrumCategory: "broad", followedRecommendation: true, overrideReason: null },
  { date: "2026-01-22", patientId: "43", condition: "viral_pharyngitis", antibiotic: "amoxicillin", bacterialProbability: 8, spectrumCategory: "narrow", followedRecommendation: false, overrideReason: "Rapid strep negative but patient insisted" },
  { date: "2026-01-20", patientId: "17", condition: "uncomplicated_uti", antibiotic: "tmp_smx", bacterialProbability: 72, spectrumCategory: "medium", followedRecommendation: true, overrideReason: null },
  { date: "2026-01-18", patientId: "38", condition: "community_acquired_pneumonia", antibiotic: "doxycycline", bacterialProbability: 75, spectrumCategory: "medium", followedRecommendation: true, overrideReason: null },
  { date: "2026-01-15", patientId: "6", condition: "strep_pharyngitis", antibiotic: "amoxicillin", bacterialProbability: 62, spectrumCategory: "narrow", followedRecommendation: true, overrideReason: null },
  { date: "2026-01-14", patientId: "25", condition: "acute_otitis_media", antibiotic: "amoxicillin", bacterialProbability: 78, spectrumCategory: "narrow", followedRecommendation: true, overrideReason: null },
  { date: "2026-01-12", patientId: "47", condition: "cellulitis", antibiotic: "tmp_smx", bacterialProbability: 68, spectrumCategory: "medium", followedRecommendation: true, overrideReason: null },
  { date: "2026-01-10", patientId: "13", condition: "uncomplicated_uti", antibiotic: "ciprofloxacin", bacterialProbability: 70, spectrumCategory: "broad", followedRecommendation: false, overrideReason: "Patient allergies" },
  { date: "2026-01-08", patientId: "35", condition: "viral_uri", antibiotic: "azithromycin", bacterialProbability: 16, spectrumCategory: "broad", followedRecommendation: false, overrideReason: "Clinical judgment" },
  { date: "2026-01-06", patientId: "52", condition: "acute_sinusitis", antibiotic: "doxycycline", bacterialProbability: 60, spectrumCategory: "medium", followedRecommendation: true, overrideReason: null },
  { date: "2026-01-04", patientId: "20", condition: "strep_pharyngitis", antibiotic: "azithromycin", bacterialProbability: 48, spectrumCategory: "broad", followedRecommendation: false, overrideReason: "Penicillin allergy" },
  { date: "2026-01-02", patientId: "42", condition: "uncomplicated_uti", antibiotic: "nitrofurantoin", bacterialProbability: 85, spectrumCategory: "narrow", followedRecommendation: true, overrideReason: null }
];

// Calculate summary statistics
export const getDashboardStats = () => {
  const history = prescribingHistory;
  const now = new Date();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000);
  const yearAgo = new Date(now - 365 * 24 * 60 * 60 * 1000);

  const filterByDate = (date) => history.filter(h => new Date(h.date) >= date);

  const last30 = filterByDate(thirtyDaysAgo);
  const last90 = filterByDate(ninetyDaysAgo);
  const last365 = filterByDate(yearAgo);

  const calculateStats = (prescriptions) => {
    const total = prescriptions.length;
    if (total === 0) return null;

    const narrow = prescriptions.filter(p => p.spectrumCategory === "narrow").length;
    const medium = prescriptions.filter(p => p.spectrumCategory === "medium").length;
    const broad = prescriptions.filter(p => p.spectrumCategory === "broad").length;
    
    const actuallyViral = prescriptions.filter(p =>
      p.condition.startsWith("viral") || p.bacterialProbability < 25
    ).length;

    const overrides = prescriptions.filter(p => !p.followedRecommendation).length;

    // Antibiotic counts
    const antibioticCounts = {};
    prescriptions.forEach(p => {
      antibioticCounts[p.antibiotic] = (antibioticCounts[p.antibiotic] || 0) + 1;
    });
    const top5 = Object.entries(antibioticCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return {
      total,
      narrowSpectrum: { count: narrow, percentage: Math.round((narrow / total) * 100) },
      mediumSpectrum: { count: medium, percentage: Math.round((medium / total) * 100) },
      broadSpectrum: { count: broad, percentage: Math.round((broad / total) * 100) },
      viralInfectionsWithAntibiotics: { count: actuallyViral, percentage: Math.round((actuallyViral / total) * 100) },
      overrideRate: { count: overrides, percentage: Math.round((overrides / total) * 100) },
      topAntibiotics: top5,
      adherenceRate: Math.round(((total - overrides) / total) * 100)
    };
  };

  return {
    last30Days: calculateStats(last30),
    last90Days: calculateStats(last90),
    last365Days: calculateStats(last365),
    facilityAverage: {
      narrowSpectrum: 68,
      broadSpectrum: 22,
      adherenceRate: 76,
      viralPrescribing: 12
    },
    trend: [
      { month: "Jan '26", adherence: 72, narrowSpectrum: 62 },
      { month: "Feb '26", adherence: 75, narrowSpectrum: 65 },
      { month: "Mar '26", adherence: 78, narrowSpectrum: 70 }
    ]
  };
};

export default prescribingHistory;
