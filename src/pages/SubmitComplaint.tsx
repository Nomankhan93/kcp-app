import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ClipboardList, Loader2, MapPin, Upload, UserRound, X } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { getCitizenAreas, getComplaintCategories, submitComplaint, validateComplaintPhoto } from '../lib/complaints';
import type { CitizenAreaRow, ComplaintCategory, ComplaintCategoryRow } from '../lib/types';

function selectedAreaFromValue(value: string, areas: CitizenAreaRow[]) {
  return areas.find((area) => area.id === value) ?? null;
}

function selectedCategoryFromValue(value: string, categories: ComplaintCategoryRow[]) {
  return categories.find((category) => category.id === value || category.slug === value) ?? null;
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function SubmitComplaint() {
  const [loading, setLoading] = useState(false);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [error, setError] = useState('');
  const [trackingNo, setTrackingNo] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [categories, setCategories] = useState<ComplaintCategoryRow[]>([]);
  const [areas, setAreas] = useState<CitizenAreaRow[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState('');

  const selectedArea = useMemo(() => selectedAreaFromValue(selectedAreaId, areas), [areas, selectedAreaId]);
  const showManualArea = selectedArea?.name.toLowerCase().includes('other') || !selectedAreaId;

  useEffect(() => {
    async function loadLookups() {
      setLoadingLookups(true);
      const [categoryRows, areaRows] = await Promise.all([getComplaintCategories(), getCitizenAreas()]);
      setCategories(categoryRows);
      setAreas(areaRows);
      setLoadingLookups(false);
    }

    void loadLookups();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setTrackingNo('');
    setLoading(true);

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const websiteValue = String(form.get('website') || '').trim();

    if (websiteValue) {
      setError('Unable to submit this request. Please refresh the page and try again.');
      setLoading(false);
      return;
    }

    const categoryValue = String(form.get('categoryId') || '');
    const categoryRow = selectedCategoryFromValue(categoryValue, categories);
    const areaValue = String(form.get('areaId') || '');
    const areaRow = selectedAreaFromValue(areaValue, areas);
    const manualArea = String(form.get('manualArea') || '').trim();
    const areaText = areaRow && !areaRow.name.toLowerCase().includes('other') ? areaRow.name : manualArea;

    if (!categoryRow) {
      setError('Please select a complaint category.');
      setLoading(false);
      return;
    }

    if (!areaText) {
      setError('Please select an area or write area / mohalla manually.');
      setLoading(false);
      return;
    }

    try {
      const tracking = await submitComplaint({
        fullName: String(form.get('fullName') || ''),
        mobile: String(form.get('mobile') || ''),
        cnic: String(form.get('cnic') || ''),
        areaId: areaRow?.id,
        areaText,
        ward: String(form.get('ward') || areaRow?.ward || ''),
        mohalla: String(form.get('mohalla') || ''),
        categoryId: categoryRow.id,
        category: categoryRow.slug as ComplaintCategory,
        details: String(form.get('details') || ''),
        photoFile,
      });

      setTrackingNo(tracking);
      formElement.reset();
      setPhotoFile(null);
      setSelectedAreaId('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit complaint.');
    } finally {
      setLoading(false);
    }
  }

  function handlePhotoChange(file: File | null) {
    setError('');

    if (!file) {
      setPhotoFile(null);
      return;
    }

    try {
      validateComplaintPhoto(file);
      setPhotoFile(file);
    } catch (photoError) {
      setPhotoFile(null);
      setError(photoError instanceof Error ? photoError.message : 'Invalid photo proof.');
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Citizen Complaint"
        title="Submit a municipal complaint"
        description="Submit sanitation, street light, drainage, water, road, encroachment and municipal record complaints. A tracking number will be generated after successful submission."
      />

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {trackingNo ? (
          <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-1 h-6 w-6" />
              <div>
                <h2 className="text-xl font-bold">Complaint submitted successfully</h2>
                <p className="mt-2 text-sm">Please save this tracking number and use it with your mobile number to check status:</p>
                <p className="mt-2 font-mono text-2xl font-black tracking-wide">{trackingNo}</p>
                <Link to="/track" className="mt-4 inline-flex rounded-xl bg-civic-700 px-4 py-2 text-sm font-bold text-white hover:bg-civic-800">
                  Track Complaint
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="hidden" aria-hidden="true">
            <label>Leave this field blank
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          {loadingLookups ? (
            <div className="flex items-center rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500 ring-1 ring-slate-200">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading categories and areas...
            </div>
          ) : null}

          <StepSection
            step="1"
            icon={<UserRound className="h-5 w-5" />}
            title="Citizen details"
            description="Use the same mobile number later to track the complaint. CNIC is optional for public tracking."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Full Name" name="fullName" required placeholder="Citizen full name" autoComplete="name" />
              <Field label="Mobile Number" name="mobile" type="tel" required placeholder="03xxxxxxxxx" inputMode="tel" autoComplete="tel" />
              <Field label="CNIC (Optional)" name="cnic" placeholder="xxxxx-xxxxxxx-x" inputMode="numeric" autoComplete="off" />
            </div>
          </StepSection>

          <StepSection
            step="2"
            icon={<MapPin className="h-5 w-5" />}
            title="Location"
            description="Select the nearest area or write mohalla/street manually so staff can identify the location quickly."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Area / Ward</span>
                <select
                  name="areaId"
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

              {showManualArea ? <Field label="Area / Mohalla" name="manualArea" required placeholder="e.g. Main Bazaar, Ward 3" /> : null}
              <Field label="Ward (Optional)" name="ward" placeholder="e.g. Ward 01" />
              <Field label="Mohalla / Street (Optional)" name="mohalla" placeholder="e.g. Jinnah Colony, Street 2" />
            </div>
          </StepSection>

          <StepSection
            step="3"
            icon={<ClipboardList className="h-5 w-5" />}
            title="Complaint details"
            description="Choose the correct service category and write enough detail for faster assignment."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-sm font-semibold text-slate-700">Complaint Category</span>
                <select
                  name="categoryId"
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2"
                >
                  <option value="">Select complaint category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}{category.department ? ` · ${category.department}` : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="mt-5 block">
              <span className="text-sm font-semibold text-slate-700">Complaint Details</span>
              <textarea
                name="details"
                required
                rows={5}
                minLength={15}
                placeholder="Write complete complaint details, exact location and any useful information."
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2"
              />
              <span className="mt-1 block text-xs text-slate-500">Minimum 15 characters recommended so staff can understand the issue.</span>
            </label>

            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 transition hover:bg-slate-100">
              <label htmlFor="complaint-photo" className="flex cursor-pointer flex-col items-center justify-center px-4 py-4 text-center">
                <Upload className="h-7 w-7 text-civic-700" />
                <span className="mt-2 text-sm font-semibold text-slate-800">Upload photo proof optional</span>
                <span className="mt-1 text-xs text-slate-500">JPG, PNG or WEBP. Max 5MB.</span>
                <input
                  id="complaint-photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => handlePhotoChange(event.target.files?.[0] ?? null)}
                />
              </label>
              {photoFile ? (
                <div className="mt-3 flex flex-col gap-3 rounded-2xl bg-white p-3 text-left ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-civic-800">{photoFile.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">Selected photo · {formatFileSize(photoFile.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPhotoFile(null)}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <X className="mr-1 h-3.5 w-3.5" /> Remove
                  </button>
                </div>
              ) : null}
            </div>
          </StepSection>

          {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p> : null}

          <div className="rounded-2xl bg-civic-50 p-4 text-sm text-civic-900 ring-1 ring-civic-100">
            <p className="font-bold">Before submitting</p>
            <p className="mt-1">Please confirm your mobile number, area and complaint details are correct. The tracking number will appear after submission.</p>
          </div>

          <button
            type="submit"
            disabled={loading || loadingLookups}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-civic-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-civic-800 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Submit Complaint
          </button>
        </form>
      </section>
    </>
  );
}

function StepSection({
  step,
  icon,
  title,
  description,
  children,
}: {
  step: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 ring-1 ring-slate-100 sm:p-5">
      <div className="mb-5 flex gap-3 border-b border-slate-100 pb-4">
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-2xl bg-civic-50 font-black text-civic-800">
          {step}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-civic-700">
            {icon}
            <h2 className="text-lg font-black text-slate-950">{title}</h2>
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  name,
  required,
  placeholder,
  type = 'text',
  inputMode,
  autoComplete,
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  type?: string;
  inputMode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}{required ? <span className="text-rose-600"> *</span> : null}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2"
      />
    </label>
  );
}
