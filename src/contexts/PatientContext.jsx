import { createContext, useContext, useState, useCallback } from 'react';

/**
 * Global patient context — shared across Dashboard, Prescribe, Discharge.
 *
 * Stores two levels of patient state:
 *   prescriberPatient   — full prescriber-schema patient (from usePatients)
 *   dischargePatientId  — the currently selected discharge-schema patient id
 *   activeDisplay       — lightweight { name, age, id, gender } shown in sidebar/navbar
 *   acceptedPrescriptions — { [patientName]: { antibiotic, name, dose, date } }
 */

const PatientContext = createContext(null);

export const PatientProvider = ({ children }) => {
  const [prescriberPatient, setPrescriberPatient]       = useState(null);
  const [dischargePatientId, setDischargePatientId]     = useState('');
  const [activeDisplay, setActiveDisplay]               = useState(null);
  const [acceptedPrescriptions, setAcceptedPrescriptions] = useState({});

  const selectPrescriberPatient = useCallback((patient) => {
    setPrescriberPatient(patient);
    if (patient) {
      setActiveDisplay({
        name:   patient.name,
        age:    patient.age,
        id:     patient.id,
        gender: patient.gender,
      });
    } else {
      setActiveDisplay(null);
    }
  }, []);

  const selectDischargePatient = useCallback((patient) => {
    if (patient) {
      setDischargePatientId(patient.id);
      setActiveDisplay({
        name:   patient.name,
        age:    patient.age,
        id:     patient.id,
        gender: patient.sex || patient.gender,
      });
    } else {
      setDischargePatientId('');
    }
  }, []);

  const recordPrescription = useCallback((patientName, data) => {
    setAcceptedPrescriptions(prev => ({
      ...prev,
      [patientName]: {
        antibiotic: data.antibiotic,
        name:       data.name || data.antibiotic,
        dose:       data.dose || 'as prescribed',
        date:       new Date().toISOString().split('T')[0],
      },
    }));
  }, []);

  const clearPatient = useCallback(() => {
    setPrescriberPatient(null);
    setDischargePatientId('');
    setActiveDisplay(null);
  }, []);

  return (
    <PatientContext.Provider value={{
      prescriberPatient,
      dischargePatientId,
      activeDisplay,
      acceptedPrescriptions,
      selectPrescriberPatient,
      selectDischargePatient,
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
