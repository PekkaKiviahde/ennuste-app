"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { createForecastAction, type ForecastFormState } from "../../server/actions/forecast";
import FormStatus from "../form-status";

const initialState: ForecastFormState = { ok: false, message: null, error: null };

type TargetOption = {
  id: string;
  label: string;
};

type MappingVersionOption = {
  id: string;
  label: string;
};

type SnapshotEvent = {
  mapping_version_id: string | null;
  comment: string | null;
  technical_progress: number | null;
  financial_progress: number | null;
  kpi_value: number | null;
};

type SnapshotLine = {
  cost_type: "LABOR" | "MATERIAL" | "SUBCONTRACT" | "RENTAL" | "OTHER";
  forecast_value: number;
  memo_general: string | null;
};

export default function ForecastForm({
  targetOptions = [],
  mappingVersionOptions = []
}: {
  targetOptions?: TargetOption[];
  mappingVersionOptions?: MappingVersionOption[];
}) {
  const [state, formAction] = useFormState(createForecastAction, initialState);
  const [targetLitteraId, setTargetLitteraId] = useState("");
  const [autoFillStatus, setAutoFillStatus] = useState<"idle" | "loading" | "done" | "empty" | "error">("idle");
  const [autoFillMessage, setAutoFillMessage] = useState<string | null>(null);
  const [planningStatus, setPlanningStatus] = useState<"DRAFT" | "READY_FOR_FORECAST" | "LOCKED" | null>(null);
  const [planningStatusError, setPlanningStatusError] = useState<string | null>(null);

  const mappingSelectRef = useRef<HTMLSelectElement>(null);
  const mappingInputRef = useRef<HTMLInputElement>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const technicalRef = useRef<HTMLInputElement>(null);
  const financialRef = useRef<HTMLInputElement>(null);
  const kpiRef = useRef<HTMLInputElement>(null);
  const laborValueRef = useRef<HTMLInputElement>(null);
  const laborMemoRef = useRef<HTMLInputElement>(null);
  const materialValueRef = useRef<HTMLInputElement>(null);
  const materialMemoRef = useRef<HTMLInputElement>(null);
  const subcontractValueRef = useRef<HTMLInputElement>(null);
  const subcontractMemoRef = useRef<HTMLInputElement>(null);
  const rentalValueRef = useRef<HTMLInputElement>(null);
  const rentalMemoRef = useRef<HTMLInputElement>(null);
  const otherValueRef = useRef<HTMLInputElement>(null);
  const otherMemoRef = useRef<HTMLInputElement>(null);

  const setInputValue = (ref: { current: HTMLInputElement | HTMLTextAreaElement | null }, value: string) => {
    if (ref.current) {
      ref.current.value = value;
    }
  };

  const setMappingValue = (value: string) => {
    if (mappingSelectRef.current) {
      mappingSelectRef.current.value = value;
    }
    if (mappingInputRef.current) {
      mappingInputRef.current.value = value;
    }
  };

  const formatPercent = (value: number | null) => {
    if (value === null || Number.isNaN(value)) return "";
    const percent = value * 100;
    const rounded = Math.round(percent * 10) / 10;
    return String(rounded);
  };

  useEffect(() => {
    if (!targetLitteraId) {
      setPlanningStatus(null);
      setPlanningStatusError(null);
      return;
    }
    const controller = new AbortController();
    const loadSnapshot = async () => {
      try {
        setAutoFillMessage("Haetaan viimeisin ennuste...");
        setAutoFillStatus("loading");
        const response = await fetch(`/api/forecast/snapshot?targetLitteraId=${encodeURIComponent(targetLitteraId)}`, {
          signal: controller.signal
        });
        if (!response.ok) {
          setAutoFillMessage("Autotaytto ei onnistunut.");
          setAutoFillStatus("error");
          return;
        }
        const snapshot = (await response.json()) as { event: SnapshotEvent | null; lines: SnapshotLine[] };
        if (!snapshot.event) {
          setAutoFillMessage("Ei aiempaa ennustetta, lomake on tyhja.");
          setAutoFillStatus("empty");
          setMappingValue("");
          setInputValue(commentRef, "");
          setInputValue(technicalRef, "");
          setInputValue(financialRef, "");
          setInputValue(kpiRef, "");
          setInputValue(laborValueRef, "");
          setInputValue(laborMemoRef, "");
          setInputValue(materialValueRef, "");
          setInputValue(materialMemoRef, "");
          setInputValue(subcontractValueRef, "");
          setInputValue(subcontractMemoRef, "");
          setInputValue(rentalValueRef, "");
          setInputValue(rentalMemoRef, "");
          setInputValue(otherValueRef, "");
          setInputValue(otherMemoRef, "");
          return;
        }

        const linesByType = new Map<SnapshotLine["cost_type"], SnapshotLine>(
          (snapshot.lines ?? []).map((line) => [line.cost_type, line])
        );

        setMappingValue(snapshot.event.mapping_version_id ?? "");
        setInputValue(commentRef, snapshot.event.comment ?? "");
        setInputValue(technicalRef, formatPercent(snapshot.event.technical_progress));
        setInputValue(financialRef, formatPercent(snapshot.event.financial_progress));
        setInputValue(kpiRef, snapshot.event.kpi_value != null ? String(snapshot.event.kpi_value) : "");
        setInputValue(laborValueRef, linesByType.get("LABOR")?.forecast_value?.toString() ?? "");
        setInputValue(laborMemoRef, linesByType.get("LABOR")?.memo_general ?? "");
        setInputValue(materialValueRef, linesByType.get("MATERIAL")?.forecast_value?.toString() ?? "");
        setInputValue(materialMemoRef, linesByType.get("MATERIAL")?.memo_general ?? "");
        setInputValue(subcontractValueRef, linesByType.get("SUBCONTRACT")?.forecast_value?.toString() ?? "");
        setInputValue(subcontractMemoRef, linesByType.get("SUBCONTRACT")?.memo_general ?? "");
        setInputValue(rentalValueRef, linesByType.get("RENTAL")?.forecast_value?.toString() ?? "");
        setInputValue(rentalMemoRef, linesByType.get("RENTAL")?.memo_general ?? "");
        setInputValue(otherValueRef, linesByType.get("OTHER")?.forecast_value?.toString() ?? "");
        setInputValue(otherMemoRef, linesByType.get("OTHER")?.memo_general ?? "");
        setAutoFillMessage("Autotaytto valmis.");
        setAutoFillStatus("done");
      } catch (error) {
        if (!controller.signal.aborted) {
          setAutoFillMessage("Autotaytto ei onnistunut.");
          setAutoFillStatus("error");
        }
      }
    };

    loadSnapshot();
    return () => controller.abort();
  }, [targetLitteraId]);

  useEffect(() => {
    if (!targetLitteraId) {
      return;
    }
    const controller = new AbortController();
    const loadPlanningStatus = async () => {
      try {
        setPlanningStatusError(null);
        const response = await fetch(`/api/planning/status?targetLitteraId=${encodeURIComponent(targetLitteraId)}`, {
          signal: controller.signal
        });
        if (!response.ok) {
          setPlanningStatusError("Suunnitelman tila ei saatavilla.");
          setPlanningStatus(null);
          return;
        }
        const payload = (await response.json()) as { status: { status: "DRAFT" | "READY_FOR_FORECAST" | "LOCKED" } | null };
        setPlanningStatus(payload.status?.status ?? null);
      } catch (error) {
        if (!controller.signal.aborted) {
          setPlanningStatusError("Suunnitelman tila ei saatavilla.");
          setPlanningStatus(null);
        }
      }
    };

    loadPlanningStatus();
    return () => controller.abort();
  }, [targetLitteraId]);

  const planningReady = planningStatus === "READY_FOR_FORECAST" || planningStatus === "LOCKED";
  const planningStatusLabel = () => {
    if (planningStatusError) {
      return planningStatusError;
    }
    if (!targetLitteraId) {
      return "Valitse tavoitearvio-littera.";
    }
    if (!planningStatus) {
      return "Suunnitelma puuttuu.";
    }
    if (planningStatus === "DRAFT") {
      return "Suunnitelma on luonnos.";
    }
    if (planningStatus === "READY_FOR_FORECAST") {
      return "Suunnitelma on valmis ennusteeseen.";
    }
    return "Suunnitelma on lukittu.";
  };

  return (
    <form className="form-grid" action={formAction}>
      <label className="label" htmlFor="targetLitteraId">Tavoitearvio-littera</label>
      {targetOptions.length > 0 ? (
        <select
          className="input"
          id="targetLitteraId"
          name="targetLitteraId"
          required
          onChange={(event) => setTargetLitteraId(event.target.value)}
        >
          <option value="">Valitse tavoitearvio-littera</option>
          {targetOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <div>
          <div className="notice">Ei tavoitearvio-litteroita. Syota UUID kasin.</div>
          <input
            className="input"
            id="targetLitteraId"
            name="targetLitteraId"
            required
            onChange={(event) => setTargetLitteraId(event.target.value)}
          />
        </div>
      )}

      <label className="label" htmlFor="mappingVersionId">Mapping-versio</label>
      {mappingVersionOptions.length > 0 ? (
        <select className="input" id="mappingVersionId" name="mappingVersionId" ref={mappingSelectRef}>
          <option value="">Ei mappingia</option>
          {mappingVersionOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <div>
          <div className="notice">Ei mapping-versioita. Syota UUID kasin.</div>
          <input className="input" id="mappingVersionId" name="mappingVersionId" ref={mappingInputRef} />
        </div>
      )}

      {autoFillMessage && (
        <div
          className={`notice ${
            autoFillStatus === "error" ? "error" : autoFillStatus === "done" ? "success" : ""
          }`}
        >
          {autoFillMessage}
        </div>
      )}

      <div
        className={`notice ${
          targetLitteraId ? (planningReady ? "success" : "error") : ""
        }`}
      >
        <strong>Suunnitelman tila:</strong> {planningStatusLabel()}
      </div>
      {!planningReady && targetLitteraId && (
        <div className="notice">
          Ennusteen tallennus on estetty, kunnes suunnitelma on READY_FOR_FORECAST tai LOCKED.
        </div>
      )}
      <div className="notice">
        Syota vahintaan yksi kustannusarvo tai perustelu. Valmiusprosenttien tulee olla 0-100.
      </div>

      <div className="grid grid-2">
        <div>
          <label className="label">Tyo</label>
          <input className="input" name="laborValue" type="number" step="0.01" min="0" ref={laborValueRef} />
          <input className="input" name="laborMemo" placeholder="Perustelu" ref={laborMemoRef} />
        </div>
        <div>
          <label className="label">Aine</label>
          <input className="input" name="materialValue" type="number" step="0.01" min="0" ref={materialValueRef} />
          <input className="input" name="materialMemo" placeholder="Perustelu" ref={materialMemoRef} />
        </div>
        <div>
          <label className="label">Alih</label>
          <input
            className="input"
            name="subcontractValue"
            type="number"
            step="0.01"
            min="0"
            ref={subcontractValueRef}
          />
          <input className="input" name="subcontractMemo" placeholder="Perustelu" ref={subcontractMemoRef} />
        </div>
        <div>
          <label className="label">Valineet</label>
          <input className="input" name="rentalValue" type="number" step="0.01" min="0" ref={rentalValueRef} />
          <input className="input" name="rentalMemo" placeholder="Perustelu" ref={rentalMemoRef} />
        </div>
        <div>
          <label className="label">Muu</label>
          <input className="input" name="otherValue" type="number" step="0.01" min="0" ref={otherValueRef} />
          <input className="input" name="otherMemo" placeholder="Perustelu" ref={otherMemoRef} />
        </div>
      </div>

      <label className="label" htmlFor="comment">Yleisperustelu</label>
      <textarea className="input" id="comment" name="comment" rows={3} ref={commentRef} />

      <div className="grid grid-3">
        <div>
          <label className="label">Tekninen valmius %</label>
          <input
            className="input"
            name="technicalProgress"
            type="number"
            step="0.1"
            min="0"
            max="100"
            ref={technicalRef}
          />
        </div>
        <div>
          <label className="label">Taloudellinen valmius %</label>
          <input
            className="input"
            name="financialProgress"
            type="number"
            step="0.1"
            min="0"
            max="100"
            ref={financialRef}
          />
        </div>
        <div>
          <label className="label">KPI-arvo</label>
          <input className="input" name="kpiValue" type="number" step="0.01" min="0" ref={kpiRef} />
        </div>
      </div>

      <FormStatus state={state} />

      <button className="btn btn-primary" type="submit" disabled={!planningReady}>
        Tallenna ennuste
      </button>
    </form>
  );
}
