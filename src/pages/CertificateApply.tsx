import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, FileUp, Loader2 } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { certificateDocumentLabels, certificateTypeLabels } from '../lib/constants';
import {
  getCertificateAreas,
  submitCertificateApplication,
  validateCertificateDocument,
  type CertificateUploadFile,
} from '../lib/certificates';
import type { CertificateDocumentKind, CertificateType, CitizenAreaRow } from '../lib/types';

type RequiredDocument = {
  kind: CertificateDocumentKind;
  label: string;
  required?: boolean;
};

const requiredDocuments: Record<CertificateType, RequiredDocument[]> = {
  birth: [
    { kind: 'applicant_cnic', label: 'Applicant CNIC', required: true },
    { kind: 'parent_cnic', label: 'Father / Mother CNIC', required: true },
    { kind: 'hospital_birth_proof', label: 'Hospital birth slip / Dai certificate / birth proof', required: true },
    { kind: 'affidavit', label: 'Affidavit / undertaking if required', required: false },
  ],
  marriage: [
    { kind: 'applicant_cnic', label: 'Applicant CNIC', required: true },
    { kind: 'bride_groom_cnic', label: 'Bride and groom CNIC copies', required: true },
    { kind: 'nikah_nama', label: 'Nikah Nama / marriage proof', required: true },
    { kind: 'witness_cnic', label: 'Witness CNIC copies if available', required: false },
  ],
  death: [
    { kind: 'applicant_cnic', label: 'Applicant CNIC', required: true },
    { kind: 'deceased_cnic', label: 'Deceased CNIC / B-form if available', required: true },
    { kind: 'death_proof', label: 'Hospital death slip / doctor certificate / death proof', required: true },
    { kind: 'graveyard_slip', label: 'Graveyard / burial slip if available', required: false },
  ],
};

function subjectLabel(type: CertificateType) {
  if (type === 'birth') return 'Child Name';
  if (type === 'marriage') return 'Groom / Bride Main Name';
  return 'Deceased Person Name';
}

function eventDateLabel(type: CertificateType) {
  if (type === 'birth') return 'Date of Birth';
  if (type === 'marriage') return 'Date of Marriage';
  return 'Date of Death';
}

function eventPlaceLabel(type: CertificateType) {
  if (type === 'birth') return 'Place of Birth';
  if (type === 'marriage') return 'Place of Marriage';
  return 'Place of Death';
}

function getInput(form: FormData, key: string) {
  return String(form.get(key) || '').trim();
}

export function CertificateApply() {
  const [certificateType, setCertificateType] = useState<CertificateType>('birth');
  const [areas, setAreas] = useState<CitizenAreaRow[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [trackingNo, setTrackingNo] = useState('');

  const selectedArea = useMemo(() => areas.find((area) => area.id === selectedAreaId), [areas, selectedAreaId]);
  const showManualArea = !selectedAreaId || selectedArea?.name.toLowerCase().includes('other');

  useEffect(() => {
    async function loadLookups() {
      setLoadingLookups(true);
      setAreas(await getCertificateAreas());
      setLoadingLookups(false);
    }

    void loadLookups();
  }, []);

  function handleFileChange(kind: CertificateDocumentKind, file: File | null) {
    setError('');

    if (!file) {
      setFiles((current) => ({ ...current, [kind]: null }));
      return;
    }

    try {
      validateCertificateDocument(file);
      setFiles((current) => ({ ...current, [kind]: file }));
    } catch (fileError) {
      setFiles((current) => ({ ...current, [kind]: null }));
      setError(fileError instanceof Error ? fileError.message : 'Invalid document file.');
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setTrackingNo('');
    setLoading(true);

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const manualArea = getInput(form, 'manualArea');
    const area = selectedArea && !selectedArea.name.toLowerCase().includes('other') ? selectedArea.name : manualArea;
    const ward = getInput(form, 'ward') || selectedArea?.ward || '';
    const docs: CertificateUploadFile[] = [];

    for (const documentItem of requiredDocuments[certificateType]) {
      const file = files[documentItem.kind];
      if (documentItem.required && !file) {
        setError(`Please upload ${documentItem.label}.`);
        setLoading(false);
        return;
      }
      if (file) docs.push({ kind: documentItem.kind, file });
    }

    const otherFile = files.other;
    if (otherFile) docs.push({ kind: 'other', file: otherFile });

    if (!area || !ward) {
      setError('Please select/provide area and ward so the related General Councilor can verify the application.');
      setLoading(false);
      return;
    }

    try {
      const tracking = await submitCertificateApplication({
        certificateType,
        applicantName: getInput(form, 'applicantName'),
        applicantMobile: getInput(form, 'applicantMobile'),
        applicantCnic: getInput(form, 'applicantCnic'),
        applicantRelation: getInput(form, 'applicantRelation'),
        applicantAddress: getInput(form, 'applicantAddress'),
        area,
        ward,
        mohalla: getInput(form, 'mohalla'),
        subjectName: getInput(form, 'subjectName'),
        subjectCnic: getInput(form, 'subjectCnic'),
        eventDate: getInput(form, 'eventDate'),
        eventPlace: getInput(form, 'eventPlace'),
        formData: {
          fatherName: getInput(form, 'fatherName'),
          motherName: getInput(form, 'motherName'),
          gender: getInput(form, 'gender'),
          groomName: getInput(form, 'groomName'),
          brideName: getInput(form, 'brideName'),
          nikahNamaNo: getInput(form, 'nikahNamaNo'),
          nikahKhawan: getInput(form, 'nikahKhawan'),
          deceasedFatherName: getInput(form, 'deceasedFatherName'),
          causeOfDeath: getInput(form, 'causeOfDeath'),
          graveyardName: getInput(form, 'graveyardName'),
        },
        documents: docs,
      });

      setTrackingNo(tracking);
      setFiles({});
      setSelectedAreaId('');
      formElement.reset();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit certificate application.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Citizen Services"
        title="Apply for birth, marriage or death certificate"
        description="Submit required information and documents online. The related ward General Councilor will verify the application, then Town Committee staff will prepare and upload the certificate."
      />

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {trackingNo ? (
          <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-1 h-6 w-6" />
              <div>
                <h2 className="text-xl font-bold">Certificate application submitted</h2>
                <p className="mt-2 text-sm">Save this tracking number and use it with your mobile number to track verification and certificate status.</p>
                <p className="mt-2 font-mono text-2xl font-black tracking-wide">{trackingNo}</p>
                <Link to="/certificates/track" className="mt-4 inline-flex rounded-xl bg-civic-700 px-4 py-2 text-sm font-bold text-white hover:bg-civic-800">
                  Track Certificate Application
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          {loadingLookups ? (
            <div className="flex items-center rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500 ring-1 ring-slate-200">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading wards and areas...
            </div>
          ) : null}

          <SectionTitle title="Certificate type" />
          <div className="grid gap-3 sm:grid-cols-3">
            {(['birth', 'marriage', 'death'] as CertificateType[]).map((type) => (
              <label key={type} className={`cursor-pointer rounded-2xl border p-4 ring-1 transition ${certificateType === type ? 'border-civic-600 bg-civic-50 ring-civic-100' : 'border-slate-200 bg-white ring-slate-100'}`}>
                <input
                  type="radio"
                  name="certificateType"
                  value={type}
                  checked={certificateType === type}
                  onChange={() => {
                    setCertificateType(type);
                    setFiles({});
                    setError('');
                  }}
                  className="sr-only"
                />
                <p className="font-bold text-slate-950">{certificateTypeLabels[type]}</p>
                <p className="mt-1 text-xs text-slate-500">Online application + ward verification</p>
              </label>
            ))}
          </div>

          <SectionTitle title="Applicant details" />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Applicant Name" name="applicantName" required />
            <Field label="Mobile Number" name="applicantMobile" type="tel" required placeholder="03xxxxxxxxx" />
            <Field label="Applicant CNIC" name="applicantCnic" placeholder="xxxxx-xxxxxxx-x" />
            <Field label="Relation with person/event" name="applicantRelation" required placeholder="Father, mother, spouse, son, daughter, self" />
            <label className="block sm:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Applicant Address</span>
              <textarea name="applicantAddress" required rows={3} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2" />
            </label>
          </div>

          <SectionTitle title="Ward / area for General Councilor verification" />
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Area / Ward</span>
              <select
                value={selectedAreaId}
                onChange={(event) => setSelectedAreaId(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2"
              >
                <option value="">Select area / ward</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}{area.ward ? ` · ${area.ward}` : ''}
                  </option>
                ))}
              </select>
            </label>
            {showManualArea ? <Field label="Manual Area / Mohalla" name="manualArea" required placeholder="e.g. Ward 2, Main Bazaar" /> : null}
            <Field label="Ward" name="ward" required placeholder="e.g. Ward 01" />
            <Field label="Mohalla / Street" name="mohalla" placeholder="e.g. Jinnah Colony" />
          </div>

          <SectionTitle title={`${certificateTypeLabels[certificateType]} information`} />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={subjectLabel(certificateType)} name="subjectName" required />
            <Field label="Subject CNIC / B-form (if available)" name="subjectCnic" />
            <Field label={eventDateLabel(certificateType)} name="eventDate" type="date" required />
            <Field label={eventPlaceLabel(certificateType)} name="eventPlace" required />

            {certificateType === 'birth' ? (
              <>
                <Field label="Father Name" name="fatherName" required />
                <Field label="Mother Name" name="motherName" required />
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Gender</span>
                  <select name="gender" required className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2">
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </label>
              </>
            ) : null}

            {certificateType === 'marriage' ? (
              <>
                <Field label="Groom Name" name="groomName" required />
                <Field label="Bride Name" name="brideName" required />
                <Field label="Nikah Nama Number" name="nikahNamaNo" />
                <Field label="Nikah Khawan Name" name="nikahKhawan" />
              </>
            ) : null}

            {certificateType === 'death' ? (
              <>
                <Field label="Father / Husband Name" name="deceasedFatherName" />
                <Field label="Cause of Death" name="causeOfDeath" />
                <Field label="Graveyard / Burial Place" name="graveyardName" />
              </>
            ) : null}
          </div>

          <SectionTitle title="Required documents" />
          <div className="grid gap-4 sm:grid-cols-2">
            {requiredDocuments[certificateType].map((documentItem) => (
              <DocumentInput key={documentItem.kind} document={documentItem} file={files[documentItem.kind] ?? null} onChange={handleFileChange} />
            ))}
            <DocumentInput
              document={{ kind: 'other', label: certificateDocumentLabels.other, required: false }}
              file={files.other ?? null}
              onChange={handleFileChange}
            />
          </div>

          {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p> : null}

          <button
            type="submit"
            disabled={loading || loadingLookups}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-civic-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-civic-800 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Submit Certificate Application
          </button>
        </form>
      </section>
    </>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="border-b border-slate-100 pb-2 text-lg font-black text-slate-950">{title}</h2>;
}

function Field({ label, name, required, placeholder, type = 'text' }: { label: string; name: string; required?: boolean; placeholder?: string; type?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}{required ? <span className="text-rose-600"> *</span> : null}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2"
      />
    </label>
  );
}

function DocumentInput({
  document,
  file,
  onChange,
}: {
  document: RequiredDocument;
  file: File | null;
  onChange: (kind: CertificateDocumentKind, file: File | null) => void;
}) {
  return (
    <label className="flex cursor-pointer flex-col rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 transition hover:bg-slate-100">
      <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
        <FileUp className="h-4 w-4 text-civic-700" />
        {document.label}{document.required ? <span className="text-rose-600">*</span> : null}
      </span>
      <span className="mt-1 text-xs text-slate-500">JPG, PNG, WEBP or PDF. Max 10MB.</span>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="sr-only"
        onChange={(event) => onChange(document.kind, event.target.files?.[0] ?? null)}
      />
      {file ? <span className="mt-2 truncate text-xs font-semibold text-civic-700">Selected: {file.name}</span> : null}
    </label>
  );
}
