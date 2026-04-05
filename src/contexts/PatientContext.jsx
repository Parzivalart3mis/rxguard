import { createContext, useContext, useState, useCallback, useMemo } from 'react';

/**
 * Global patient context — shared across Dashboard, Prescribe, Discharge.
 *
 * Stores two levels of patient state:
 *   activePatient         — full schema patient
 *   activeDisplay         — lightweight { name, age, id, gender } shown in sidebar/navbar
 *   acceptedPrescriptions — { [patientName]: { antibiotic, name, dose, date } }
 */

const PatientContext = createContext(null);

export const PatientProvider = ({ children }) => {
  const [activePatient, setActivePatient] = useState(null);
  const [acceptedPrescriptions, setAcceptedPrescriptions] = useState({});

  const selectPatient = useCallback((patient) => {
    setActivePatient(patient);
  }, []);

  const activeDisplay = useMemo(() => {
    if (!activePatient) return null;
    return {
      name: activePatient.name,
      age: activePatient.age,
      id: activePatient.id,
      gender: activePatient.sex || activePatient.gender,
    };
  }, [activePatient]);

  const recordPrescription = useCallback((patientName, data) => {
    setAcceptedPrescriptions(prev => ({
      ...prev,
      [patientName]: {
        antibiotic: data.antibiotic,
        name: data.name || data.antibiotic,
        dose: data.dose || null,
        frequency: data.frequency || null,
        duration: data.duration || null,
        recommended: data.recommended || null,
        isOverride: data.isOverride || false,
        overrideReason: data.overrideReason || null,
        overrideNotes: data.overrideNotes || null,
        date: new Date().toISOString().split('T')[0],
      },
    }));
  }, []);

  const clearPatient = useCallback(() => {
    setActivePatient(null);
  }, []);

  return (
    <PatientContext.Provider value={{
      activePatient,
      // Alias for backwards compatibility where prescriberPatient is used
      prescriberPatient: activePatient, 
      activeDisplay,
      acceptedPrescriptions,
      selectPatient,
      // Alias for backwards compatibility
      selectPrescriberPatient: selectPatient,
      selectDischargePatient: selectPatient,
      recordPrescription,
      clearPatient,
    }}>
      {children}
    </PatientContext.Provider>
  );
};

export const usePatientContext = () => {
  const ctx = useContext(PatientContext);
  if (!ctx) throw new Error('usePatientContext must be used inside PatientProvider');
  return ctx;
};
