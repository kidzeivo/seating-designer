import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Crown,
  Download,
  Grid3X3,
  Hand,
  LayoutGrid,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Upload,
  UserMinus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const SAVED_VERSIONS_KEY = "seating-designer-versions";

type SavedVersion = {
  id: string;
  name: string;
  savedAt: string;
  guests: Guest[];
  tables: TableModel[];
  stageSize?: { w: number; h: number };
  pan?: { x: number; y: number };
};

type VersionMeta = { id: string; name: string; savedAt: string };
type SaveDestination = "server" | "local";

type GuestGender = "female" | "male";

type Guest = {
  id: string;
  name: string;
  gender: GuestGender;
  photoUrl?: string;
};

type Chair = {
  id: string;
  guestId?: string;
};

type TableShape = "round" | "rect";

type TableNumberStyle = "classic" | "monogram" | "modern";

type TableModel = {
  id: string;
  number: number;
  label?: string;
  shape: TableShape;
  numberStyle: TableNumberStyle;
  isVip?: boolean;
  x: number;
  y: number;
  rotation: number;
  chairs: Chair[];
};

const TOUR_URL =
  "https://tour.giraffe360.com/418705e5f4394ccfb39be962e64e3310/";

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function initials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase() || "?";
}

function avatarDataUrl(gender: GuestGender) {
  const isFemale = gender === "female";
  const bg = isFemale ? "FCE7F3" : "DBEAFE";
  const accent = isFemale ? "EC4899" : "2563EB";
  const hair = isFemale ? "7C2D12" : "111827";
  const shirt = isFemale ? "FB7185" : "60A5FA";
  const svg = `
  <svg xmlns='http://www.w3.org/2000/svg' width='256' height='256' viewBox='0 0 256 256'>
    <rect width='256' height='256' rx='64' fill='%23${bg}'/>
    <circle cx='128' cy='106' r='56' fill='%23F8D8C0'/>
    ${
      isFemale
        ? "<path d='M74 110c6-44 36-66 54-66s48 22 54 66c-10-16-28-30-54-30s-44 14-54 30Z' fill='%23" +
          hair +
          "' opacity='.9'/>"
        : "<path d='M82 92c18-34 72-34 92 0c-14-10-30-14-46-14s-32 4-46 14Z' fill='%23" +
          hair +
          "' opacity='.9'/>"
    }
    <circle cx='107' cy='112' r='6' fill='%23111827' opacity='.9'/>
    <circle cx='149' cy='112' r='6' fill='%23111827' opacity='.9'/>
    <path d='M110 136c10 10 26 10 36 0' fill='none' stroke='%23111827' stroke-width='6' stroke-linecap='round' opacity='.65'/>
    <path d='M58 240c8-48 42-76 70-76s62 28 70 76' fill='%23${shirt}' opacity='.85'/>
    <path d='M78 170c14 18 30 26 50 26s36-8 50-26' fill='none' stroke='%23${accent}' stroke-width='10' stroke-linecap='round' opacity='.35'/>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`;
}

function TableBadge({
  number,
  style,
}: {
  number: number;
  style: TableNumberStyle;
}) {
  if (style === "monogram") {
    return (
      <div
        className="relative grid place-items-center"
        data-testid={`badge-table-number-${number}`}
      >
        <div className="h-9 w-9 rounded-full bg-gradient-to-b from-white to-[#fff7] shadow-sm ring-1 ring-black/5" />
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="font-serif text-[13px] font-semibold tracking-tight text-foreground">
            {number}
          </div>
        </div>
        <div className="pointer-events-none absolute -bottom-2 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 rounded-[2px] bg-white ring-1 ring-black/5" />
      </div>
    );
  }

  if (style === "modern") {
    return (
      <div
        className="inline-flex items-center gap-2 rounded-full bg-foreground px-3 py-1 text-[12px] font-semibold text-background shadow-sm"
        data-testid={`badge-table-number-${number}`}
      >
        <Sparkles className="h-3.5 w-3.5" />
        Table {number}
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-2 rounded-lg border bg-white px-2.5 py-1 text-[12px] font-semibold shadow-sm"
      data-testid={`badge-table-number-${number}`}
    >
      <Crown className="h-3.5 w-3.5 text-primary" />
      Table {number}
    </div>
  );
}

function ChairDot({
  index,
  total,
  radius,
  rotation,
}: {
  index: number;
  total: number;
  radius: number;
  rotation: number;
}) {
  const angle = ((Math.PI * 2) / total) * index + rotation;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;
  return (
    <div
      className="absolute h-3.5 w-3.5 rounded-full bg-white shadow-sm ring-1 ring-black/10"
      style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)` }}
    />
  );
}

function ChairRect({
  index,
  total,
  w,
  h,
}: {
  index: number;
  total: number;
  w: number;
  h: number;
}) {
  const perSide = Math.ceil(total / 4);
  const side = Math.floor(index / perSide);
  const posOnSide = index % perSide;
  const t = perSide <= 1 ? 0.5 : posOnSide / (perSide - 1);

  let x = 0;
  let y = 0;
  if (side === 0) {
    x = -w / 2 + t * w;
    y = -h / 2;
  } else if (side === 1) {
    x = w / 2;
    y = -h / 2 + t * h;
  } else if (side === 2) {
    x = -w / 2 + t * w;
    y = h / 2;
  } else {
    x = -w / 2;
    y = -h / 2 + t * h;
  }

  return (
    <div
      className="absolute h-3.5 w-3.5 rounded-md bg-white shadow-sm ring-1 ring-black/10"
      style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)` }}
    />
  );
}

function GuestChip({
  guest,
  onRemove,
}: {
  guest: Guest;
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <img
          src={guest.photoUrl || avatarDataUrl(guest.gender)}
          alt={guest.name}
          className="h-7 w-7 rounded-full object-cover ring-1 ring-black/10"
          data-testid={`img-guest-${guest.id}`}
        />
        <div
          className={cn(
            "absolute -bottom-1 -right-1 h-3 w-3 rounded-full ring-2 ring-white",
            guest.gender === "female" ? "bg-pink-400" : "bg-blue-500",
          )}
        />
      </div>
      <div className="min-w-0">
        <div
          className="truncate text-[13px] font-semibold"
          data-testid={`text-guest-name-${guest.id}`}
        >
          {guest.name}
        </div>
        <div className="text-[11px] text-muted-foreground">{guest.gender}</div>
      </div>
      {onRemove ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onRemove}
          data-testid={`button-remove-guest-${guest.id}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}

function useEventListener<K extends keyof WindowEventMap>(
  type: K,
  handler: (ev: WindowEventMap[K]) => void,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;
    window.addEventListener(type, handler as any);
    return () => window.removeEventListener(type, handler as any);
  }, [type, handler, enabled]);
}

export default function SeatingDesignerPage() {
  const [showTour, setShowTour] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [tool, setTool] = useState<"select" | "pan">("pan");

  // Default initial state (fallback if no server versions found)
  const defaultGuests: Guest[] = [
    { id: "g1", name: "Ava Johnson", gender: "female" },
    { id: "g2", name: "Noah Williams", gender: "male" },
    { id: "g3", name: "Sophia Brown", gender: "female" },
    { id: "g4", name: "Liam Jones", gender: "male" },
    { id: "g5", name: "Isabella Davis", gender: "female" },
    { id: "g6", name: "Ethan Miller", gender: "male" },
    { id: "g7", name: "Mia Wilson", gender: "female" },
    { id: "g8", name: "Lucas Moore", gender: "male" },
    { id: "g9", name: "Amelia Taylor", gender: "female" },
    { id: "g10", name: "Benjamin Anderson", gender: "male" },
  ];

  const defaultTables: TableModel[] = [
    {
      id: "t1",
      number: 1,
      shape: "round",
      numberStyle: "classic",
      isVip: true,
      x: 240,
      y: 210,
      rotation: 0,
      chairs: Array.from({ length: 8 }).map((_, i) => ({
        id: `t1c${i + 1}`,
        guestId: i < 4 ? `g${i + 1}` : undefined,
      })),
    },
    {
      id: "t2",
      number: 2,
      shape: "round",
      numberStyle: "monogram",
      isVip: false,
      x: 520,
      y: 260,
      rotation: 0.2,
      chairs: Array.from({ length: 10 }).map((_, i) => ({
        id: `t2c${i + 1}`,
        guestId: i < 3 ? `g${i + 5}` : undefined,
      })),
    },
    {
      id: "t3",
      number: 3,
      shape: "rect",
      numberStyle: "modern",
      isVip: false,
      x: 350,
      y: 430,
      rotation: 0,
      chairs: Array.from({ length: 12 }).map((_, i) => ({
        id: `t3c${i + 1}`,
        guestId: i < 3 ? `g${i + 8}` : undefined,
      })),
    },
  ];

  const [guests, setGuests] = useState<Guest[]>(defaultGuests);
  const [tables, setTables] = useState<TableModel[]>(defaultTables);
  const [hasAutoLoaded, setHasAutoLoaded] = useState(false);

  const [selectedTableId, setSelectedTableId] = useState<string | null>("t1");
  const selectedTable = useMemo(
    () => tables.find((t) => t.id === selectedTableId) ?? null,
    [tables, selectedTableId],
  );

  const [activeSeat, setActiveSeat] = useState<{
    tableId: string;
    chairId: string;
  } | null>(null);

  const stageRef = useRef<HTMLDivElement | null>(null);
  
  // Calculate stage size that fits all tables with padding
  function calculateStageSize(tablesList: TableModel[]): { w: number; h: number } {
    if (tablesList.length === 0) {
      const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
      return isMobile ? { w: Math.min(800, window.innerWidth - 32), h: 600 } : { w: 1000, h: 650 };
    }
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    const padding = isMobile ? 100 : 200;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    tablesList.forEach((t) => {
      const tableSize = t.shape === "rect" ? { w: 126, h: 74 } : { w: 98, h: 98 };
      const halfW = tableSize.w / 2;
      const halfH = tableSize.h / 2;
      minX = Math.min(minX, t.x - halfW);
      minY = Math.min(minY, t.y - halfH);
      maxX = Math.max(maxX, t.x + halfW);
      maxY = Math.max(maxY, t.y + halfH);
    });
    
    const calculatedW = maxX - minX + padding * 2;
    const calculatedH = maxY - minY + padding * 2;
    
    if (isMobile) {
      const maxWidth = Math.min(800, window.innerWidth - 32);
      return {
        w: Math.max(maxWidth, calculatedW),
        h: Math.max(500, calculatedH),
      };
    }
    
    return {
      w: Math.max(800, calculatedW),
      h: Math.max(600, calculatedH),
    };
  }
  
  const [stageSize, setStageSize] = useState(() => calculateStageSize(defaultTables));
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [resizingStage, setResizingStage] = useState(false);
  const panStart = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  const gridSize = 24;

  useEffect(() => {
    if (!resizingStage) return;
    const onMove = (e: MouseEvent) => {
      setStageSize((prev) => ({
        w: Math.max(400, prev.w + e.movementX),
        h: Math.max(300, prev.h + e.movementY),
      }));
    };
    const onUp = () => setResizingStage(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizingStage]);

  const [isGuestFormOpen, setIsGuestFormOpen] = useState(false);
  const [newGuest, setNewGuest] = useState({ title: "", firstName: "", lastName: "", gender: "female" as GuestGender });
  const [draggedGuestId, setDraggedGuestId] = useState<string | null>(null);

  const [saveDestination, setSaveDestination] = useState<SaveDestination>("server");
  const [serverVersions, setServerVersions] = useState<VersionMeta[]>([]);
  const [serverVersionsLoading, setServerVersionsLoading] = useState(true);
  const [serverSaveLoading, setServerSaveLoading] = useState(false);

  const [savedVersions, setSavedVersions] = useState<SavedVersion[]>(() => {
    try {
      const raw = localStorage.getItem(SAVED_VERSIONS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as SavedVersion[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [versionName, setVersionName] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(SAVED_VERSIONS_KEY, JSON.stringify(savedVersions));
    } catch {
      // ignore
    }
  }, [savedVersions]);

  async function fetchServerVersions() {
    try {
      const res = await fetch("/api/versions");
      if (res.ok) {
        const list = (await res.json()) as VersionMeta[];
        setServerVersions(list);
        return list;
      } else {
        console.error("Failed to fetch server versions:", res.status, res.statusText);
        return [];
      }
    } catch (err) {
      console.error("Error fetching server versions:", err);
      setServerVersions([]);
      return [];
    } finally {
      setServerVersionsLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    async function loadLatestServerVersion() {
      try {
        const versions = await fetchServerVersions();
        if (!mounted) return;
        if (versions.length > 0) {
          // Versions are already sorted by date (newest first)
          const latestId = versions[0].id;
          const res = await fetch(`/api/versions/${latestId}`);
          if (!mounted) return;
          if (res.ok) {
            const data = (await res.json()) as SavedVersion;
            const guestsCopy = JSON.parse(JSON.stringify(data.guests)) as Guest[];
            const tablesCopy = JSON.parse(JSON.stringify(data.tables)) as TableModel[];
            setGuests(guestsCopy);
            setTables(tablesCopy);
            setSelectedTableId(tablesCopy[0]?.id ?? null);
            if (data.stageSize) {
              setStageSize(data.stageSize);
            } else {
              setStageSize(calculateStageSize(tablesCopy));
            }
            if (data.pan) {
              setPan(data.pan);
            } else {
              setPan({ x: 0, y: 0 });
            }
            setHasAutoLoaded(true);
            console.log(`Auto-loaded latest version: "${data.name}"`);
            toast({
              title: "Loaded latest version",
              description: `"${data.name}" loaded automatically.`,
            });
          } else {
            setHasAutoLoaded(true);
          }
        } else {
          // No server versions, use defaults
          setHasAutoLoaded(true);
        }
      } catch (err) {
        console.error("Error auto-loading latest version:", err);
        if (mounted) setHasAutoLoaded(true);
      }
    }
    loadLatestServerVersion();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recalculate stage size on mobile when window resizes or tables change
  useEffect(() => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    if (isMobile && hasAutoLoaded) {
      const newSize = calculateStageSize(tables);
      setStageSize(newSize);
    }
  }, [tables, hasAutoLoaded]);

  useEffect(() => {
    const handleResize = () => {
      const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
      if (isMobile && hasAutoLoaded) {
        const newSize = calculateStageSize(tables);
        setStageSize(newSize);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [tables, hasAutoLoaded]);

  async function saveCurrentVersion(name: string) {
    const trimmed = name.trim() || `Version ${serverVersions.length + savedVersions.length + 1}`;
    if (saveDestination === "server") {
      setServerSaveLoading(true);
      try {
        const res = await fetch("/api/versions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: trimmed,
            guests: JSON.parse(JSON.stringify(guests)),
            tables: JSON.parse(JSON.stringify(tables)),
            stageSize: { ...stageSize },
            pan: { ...pan },
          }),
        });
        if (res.ok) {
          setVersionName("");
          await fetchServerVersions();
          toast({
            title: "Version saved",
            description: `"${trimmed}" saved to server successfully.`,
          });
        } else {
          const error = await res.json().catch(() => ({ message: "Failed to save version" }));
          toast({
            title: "Failed to save",
            description: error.message || "Server error. Check console for details.",
            variant: "destructive",
          });
          console.error("Save failed:", res.status, error);
        }
      } catch (err) {
        toast({
          title: "Failed to save",
          description: "Network error. Make sure the server is running.",
          variant: "destructive",
        });
        console.error("Save error:", err);
      } finally {
        setServerSaveLoading(false);
      }
      return;
    }
    const version: SavedVersion = {
      id: uid("v"),
      name: trimmed,
      savedAt: new Date().toISOString(),
      guests: JSON.parse(JSON.stringify(guests)),
      tables: JSON.parse(JSON.stringify(tables)),
      stageSize: { ...stageSize },
      pan: { ...pan },
    };
    setSavedVersions((prev) => [version, ...prev].slice(0, 20));
    setVersionName("");
  }

  function loadLocalVersion(id: string) {
    const v = savedVersions.find((x) => x.id === id);
    if (!v) return;
    const guestsCopy = JSON.parse(JSON.stringify(v.guests)) as Guest[];
    const tablesCopy = JSON.parse(JSON.stringify(v.tables)) as TableModel[];
    setGuests(guestsCopy);
    setTables(tablesCopy);
    setSelectedTableId(tablesCopy[0]?.id ?? null);
    if (v.stageSize) {
      setStageSize(v.stageSize);
    } else {
      setStageSize(calculateStageSize(tablesCopy));
    }
    if (v.pan) {
      setPan(v.pan);
    } else {
      setPan({ x: 0, y: 0 });
    }
  }

  async function loadServerVersion(id: string) {
    try {
      const res = await fetch(`/api/versions/${id}`);
      if (!res.ok) {
        toast({
          title: "Failed to load",
          description: "Version not found or server error.",
          variant: "destructive",
        });
        return;
      }
      const data = (await res.json()) as SavedVersion;
      const guestsCopy = JSON.parse(JSON.stringify(data.guests)) as Guest[];
      const tablesCopy = JSON.parse(JSON.stringify(data.tables)) as TableModel[];
      setGuests(guestsCopy);
      setTables(tablesCopy);
      setSelectedTableId(tablesCopy[0]?.id ?? null);
      if (data.stageSize) {
        setStageSize(data.stageSize);
      } else {
        setStageSize(calculateStageSize(tablesCopy));
      }
      if (data.pan) {
        setPan(data.pan);
      } else {
        setPan({ x: 0, y: 0 });
      }
      toast({
        title: "Version loaded",
        description: `"${data.name}" loaded successfully.`,
      });
    } catch (err) {
      toast({
        title: "Failed to load",
        description: "Network error. Check console for details.",
        variant: "destructive",
      });
      console.error("Load error:", err);
    }
  }

  function deleteLocalVersion(id: string) {
    setSavedVersions((prev) => prev.filter((x) => x.id !== id));
  }

  async function deleteServerVersion(id: string) {
    try {
      const res = await fetch(`/api/versions/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchServerVersions();
        toast({
          title: "Version deleted",
          description: "Version removed from server.",
        });
      } else {
        toast({
          title: "Failed to delete",
          description: "Server error. Check console for details.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Failed to delete",
        description: "Network error. Check console for details.",
        variant: "destructive",
      });
      console.error("Delete error:", err);
    }
  }

  function exportVersion(version: SavedVersion | VersionMeta, isServer: boolean) {
    async function doExport() {
      try {
        let fullVersion: SavedVersion;
        if (isServer && "id" in version && !("guests" in version)) {
          // Fetch full version from server
          const res = await fetch(`/api/versions/${version.id}`);
          if (!res.ok) {
            toast({
              title: "Failed to export",
              description: "Could not fetch version data.",
              variant: "destructive",
            });
            return;
          }
          fullVersion = (await res.json()) as SavedVersion;
        } else {
          fullVersion = version as SavedVersion;
        }

        const exportData = {
          name: fullVersion.name,
          savedAt: fullVersion.savedAt,
          guests: fullVersion.guests,
          tables: fullVersion.tables,
          stageSize: fullVersion.stageSize,
          pan: fullVersion.pan,
        };

        const json = JSON.stringify(exportData, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `seating-plan-${fullVersion.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${new Date(fullVersion.savedAt).toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast({
          title: "Version exported",
          description: `"${fullVersion.name}" exported successfully.`,
        });
      } catch (err) {
        toast({
          title: "Failed to export",
          description: "Error exporting version. Check console for details.",
          variant: "destructive",
        });
        console.error("Export error:", err);
      }
    }
    doExport();
  }

  function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text) as SavedVersion;

        // Validate structure
        if (!Array.isArray(data.guests) || !Array.isArray(data.tables)) {
          throw new Error("Invalid file format: missing guests or tables");
        }

        // Load the imported version
        const guestsCopy = JSON.parse(JSON.stringify(data.guests)) as Guest[];
        const tablesCopy = JSON.parse(JSON.stringify(data.tables)) as TableModel[];
        setGuests(guestsCopy);
        setTables(tablesCopy);
        setSelectedTableId(tablesCopy[0]?.id ?? null);
        if (data.stageSize) {
          setStageSize(data.stageSize);
        } else {
          setStageSize(calculateStageSize(tablesCopy));
        }
        if (data.pan) {
          setPan(data.pan);
        } else {
          setPan({ x: 0, y: 0 });
        }

        toast({
          title: "Version imported",
          description: `"${data.name || "Imported version"}" loaded successfully.`,
        });
      } catch (err) {
        toast({
          title: "Failed to import",
          description: err instanceof Error ? err.message : "Invalid file format.",
          variant: "destructive",
        });
        console.error("Import error:", err);
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be imported again
    event.target.value = "";
  }

  const unassignedGuests = useMemo(() => {
    const assigned = new Set<string>();
    tables.forEach((t) => t.chairs.forEach((c) => c.guestId && assigned.add(c.guestId)));
    return guests.filter((g) => !assigned.has(g.id));
  }, [guests, tables]);

  const nextTableNumber = useMemo(() => {
    const max = tables.reduce((m, t) => Math.max(m, t.number), 0);
    return max + 1;
  }, [tables]);

  const guestsByTable = useMemo(() => {
    return [...tables]
      .sort((a, b) => a.number - b.number)
      .map((t) => ({
        tableId: t.id,
        tableNumber: t.number,
        shape: t.shape,
        isVip: t.isVip ?? false,
        seats: t.chairs.map((c, i) => ({
          chairId: c.id,
          seatNumber: i + 1,
          guest: c.guestId ? guests.find((g) => g.id === c.guestId) : undefined,
        })),
      }));
  }, [tables, guests]);

  function escapeCsvCell(value: string) {
    if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
    return value;
  }

  function exportToCsv() {
    const headers = ["Table Number", "VIP", "Seat", "Guest Name", "Gender"];
    const rows: string[][] = [headers];
    guestsByTable.forEach(({ tableNumber, isVip, seats }) => {
      seats.forEach(({ seatNumber, guest }) => {
        rows.push([
          String(tableNumber),
          isVip ? "Yes" : "",
          String(seatNumber),
          guest ? guest.name : "",
          guest ? guest.gender : "",
        ]);
      });
    });
    unassignedGuests.forEach((g) => {
      rows.push(["", "", "", g.name, g.gender]);
    });
    const csv = rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `seating-guests-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function snap(n: number) {
    if (!snapToGrid) return n;
    return Math.round(n / gridSize) * gridSize;
  }

  function setTablePatch(tableId: string, patch: Partial<TableModel>) {
    setTables((prev) => prev.map((t) => (t.id === tableId ? { ...t, ...patch } : t)));
  }

  function setChairsCount(tableId: string, count: number) {
    setTables((prev) =>
      prev.map((t) => {
        if (t.id !== tableId) return t;
        const next = clamp(count, 2, 20);
        const existing = t.chairs;
        if (existing.length === next) return t;

        if (existing.length < next) {
          const add = Array.from({ length: next - existing.length }).map((_, i) => ({
            id: uid(`${t.id}c${existing.length + i + 1}`),
          }));
          return { ...t, chairs: [...existing, ...add] };
        }

        const trimmed = existing.slice(0, next);
        return { ...t, chairs: trimmed };
      }),
    );
  }

  function addTable(shape: TableShape) {
    const id = uid("t");
    const base: TableModel = {
      id,
      number: nextTableNumber,
      shape,
      numberStyle: shape === "rect" ? "modern" : "classic",
      isVip: false,
      x: snap(stageSize.w * 0.5 - pan.x),
      y: snap(stageSize.h * 0.5 - pan.y),
      rotation: 0,
      chairs: Array.from({ length: shape === "rect" ? 12 : 8 }).map((_, i) => ({
        id: `${id}c${i + 1}`,
      })),
    };
    setTables((p) => [...p, base]);
    setSelectedTableId(id);
  }

  function duplicateTable(tableId: string) {
    const t = tables.find((x) => x.id === tableId);
    if (!t) return;
    const id = uid("t");
    const copied: TableModel = {
      ...t,
      id,
      number: nextTableNumber,
      isVip: t.isVip ?? false,
      x: snap(t.x + 40),
      y: snap(t.y + 40),
      chairs: t.chairs.map((c, i) => ({ id: `${id}c${i + 1}`, guestId: c.guestId })),
    };
    setTables((p) => [...p, copied]);
    setSelectedTableId(id);
  }

  function deleteTable(tableId: string) {
    setTables((prev) => prev.filter((t) => t.id !== tableId));
    setSelectedTableId((cur) => (cur === tableId ? null : cur));
  }

  function assignGuest(tableId: string, chairId: string, guestId?: string) {
    setTables((prev) =>
      prev.map((t) => {
        if (t.id !== tableId) return t;
        return {
          ...t,
          chairs: t.chairs.map((c) => (c.id === chairId ? { ...c, guestId } : c)),
        };
      }),
    );
  }

  function unassignGuestEverywhere(guestId: string) {
    setTables((prev) =>
      prev.map((t) => ({
        ...t,
        chairs: t.chairs.map((c) => (c.guestId === guestId ? { ...c, guestId: undefined } : c)),
      })),
    );
  }

  function removeGuest(guestId: string) {
    unassignGuestEverywhere(guestId);
    setGuests((prev) => prev.filter((g) => g.id !== guestId));
  }

  const dragging = useRef<{
    tableId: string;
    startX: number;
    startY: number;
    tableX: number;
    tableY: number;
  } | null>(null);

  function onStagePointerDown(e: React.PointerEvent) {
    if (tool !== "pan") return;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    setPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
  }

  function onStagePointerMove(e: React.PointerEvent) {
    if (!panning || tool !== "pan" || !panStart.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setPan({ x: panStart.current.px + dx, y: panStart.current.py + dy });
  }

  function onStagePointerUp() {
    setPanning(false);
    panStart.current = null;
  }

  function startDrag(tableId: string, e: React.PointerEvent) {
    if (tool !== "select") return;
    const t = tables.find((x) => x.id === tableId);
    if (!t) return;

    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    setSelectedTableId(tableId);
    
    // Get the stage position to adjust coordinate system
    const stageRect = stageRef.current?.getBoundingClientRect();
    if (!stageRect) return;

    dragging.current = {
      tableId,
      startX: e.clientX,
      startY: e.clientY,
      tableX: t.x,
      tableY: t.y,
    };
  }

  function moveDrag(e: React.PointerEvent) {
    if (!dragging.current) return;
    const d = dragging.current;
    
    // Scale factors in case of CSS scaling, though usually 1:1
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    
    // IMPORTANT: Subtract pan to keep it aligned with the panning layer
    // The table position is relative to the "panning layer", so we don't subtract pan here
    // unless the table X/Y are stored in absolute stage coordinates. 
    // Based on previous code: left: t.x, top: t.y inside the pan-translated div.
    
    setTablePatch(d.tableId, { 
      x: snap(d.tableX + dx), 
      y: snap(d.tableY + dy) 
    });
  }

  function endDrag() {
    dragging.current = null;
  }

  useEventListener(
    "keydown",
    (ev) => {
      if (ev.key === "Escape") setActiveSeat(null);
      if (ev.key === "Delete" && selectedTableId) deleteTable(selectedTableId);
    },
    true,
  );

  const stageOverlay = showGrid ? "canvas-grid" : "";

  const availableTour = showTour;

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_700px_at_30%_10%,rgba(253,230,138,0.35),transparent_60%),radial-gradient(900px_600px_at_90%_30%,rgba(147,197,253,0.35),transparent_55%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background))) ]">
      <div className="mx-auto max-w-[1400px] px-4 py-5">
        <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border bg-white/70 px-3 py-1 text-xs font-semibold tracking-wide text-muted-foreground shadow-sm">
              <span className="h-2 w-2 rounded-full bg-primary" />
              D & R Weddings & Event Venue
            </div>
            <h1
              className="mt-3 font-serif text-3xl tracking-tight sm:text-4xl"
              data-testid="text-page-title"
            >
              Seating Designer
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Drag tables on the floor plan, choose chair counts, and assign guests seat-by-seat.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="glass grain shadow-soft inline-flex items-center gap-1 rounded-full px-2 py-1">
              <Button
                variant={tool === "select" ? "default" : "ghost"}
                size="sm"
                className={cn("rounded-full", tool === "select" && "shadow-sm")}
                onClick={() => setTool("select")}
                data-testid="button-tool-select"
              >
                <LayoutGrid className="mr-1 h-4 w-4" />
                Select
              </Button>
              <Button
                variant={tool === "pan" ? "default" : "ghost"}
                size="sm"
                className={cn("rounded-full", tool === "pan" && "shadow-sm")}
                onClick={() => setTool("pan")}
                data-testid="button-tool-pan"
              >
                <Hand className="mr-1 h-4 w-4" />
                Pan
              </Button>
            </div>

            <Button
              variant="outline"
              className="rounded-full bg-white/70"
              onClick={() => setShowGrid((s) => !s)}
              data-testid="button-toggle-grid"
            >
              <Grid3X3 className="mr-2 h-4 w-4" />
              Grid
              <span className="ml-2 text-xs text-muted-foreground">{showGrid ? "On" : "Off"}</span>
            </Button>

            <Button
              variant="outline"
              className="rounded-full bg-white/70"
              onClick={() => setSnapToGrid((s) => !s)}
              data-testid="button-toggle-snap"
            >
              Snap
              <span className="ml-2 text-xs text-muted-foreground">{snapToGrid ? "On" : "Off"}</span>
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[420px_1fr]">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            <Card className="glass grain shadow-soft overflow-hidden border-white/40">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold" data-testid="text-leftpanel-title">
                      Tools
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Add tables, tweak chair counts, and assign guests.
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">3D tour</Label>
                      <Switch
                        checked={showTour}
                        onCheckedChange={setShowTour}
                        data-testid="switch-tour"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button
                    variant={selectedTable?.shape === "round" ? "default" : "secondary"}
                    className={cn(
                      "rounded-xl",
                      selectedTable?.shape !== "round" && "bg-gray-200 text-gray-600 hover:bg-gray-300",
                    )}
                    onClick={() => addTable("round")}
                    data-testid="button-add-round-table"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Round table
                  </Button>
                  <Button
                    variant={selectedTable?.shape === "rect" ? "default" : "secondary"}
                    className={cn(
                      "rounded-xl",
                      selectedTable?.shape !== "rect" && "bg-gray-200 text-gray-600 hover:bg-gray-300",
                    )}
                    onClick={() => addTable("rect")}
                    data-testid="button-add-rect-table"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Rectangle
                  </Button>
                </div>

                <Separator className="my-4" />

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold" data-testid="text-selected-table">
                      {selectedTable ? `Selected: Table ${selectedTable.number}` : "No table selected"}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Click a table on the stage to edit it.
                    </div>
                  </div>
                  {selectedTable ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => duplicateTable(selectedTable.id)}
                        data-testid="button-duplicate-table"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive"
                        onClick={() => deleteTable(selectedTable.id)}
                        data-testid="button-delete-table"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>

                {selectedTable ? (
                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="table-number" className="text-xs">
                          Table number
                        </Label>
                        <Input
                          id="table-number"
                          type="number"
                          value={selectedTable.number}
                          onChange={(e) =>
                            setTablePatch(selectedTable.id, {
                              number: Number(e.target.value || 1),
                            })
                          }
                          className="rounded-xl bg-white/70"
                          data-testid="input-table-number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Number style</Label>
                        <Select
                          value={selectedTable.numberStyle}
                          onValueChange={(v) =>
                            setTablePatch(selectedTable.id, { numberStyle: v as TableNumberStyle })
                          }
                        >
                          <SelectTrigger className="rounded-xl bg-white/70" data-testid="select-number-style">
                            <SelectValue placeholder="Style" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="classic">Classic</SelectItem>
                            <SelectItem value="monogram">Monogram</SelectItem>
                            <SelectItem value="modern">Modern</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Shape</Label>
                        <Select
                          value={selectedTable.shape}
                          onValueChange={(v) =>
                            setTablePatch(selectedTable.id, { shape: v as TableShape })
                          }
                        >
                          <SelectTrigger className="rounded-xl bg-white/70" data-testid="select-table-shape">
                            <SelectValue placeholder="Shape" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="round">Round</SelectItem>
                            <SelectItem value="rect">Rectangle</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="chair-count" className="text-xs">
                          Chairs
                        </Label>
                        <Input
                          id="chair-count"
                          type="number"
                          value={selectedTable.chairs.length}
                          onChange={(e) =>
                            setChairsCount(selectedTable.id, Number(e.target.value || 8))
                          }
                          className="rounded-xl bg-white/70"
                          data-testid="input-chair-count"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border bg-white/70 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-amber-500" />
                        <Label className="text-xs font-medium">VIP table</Label>
                      </div>
                      <Switch
                        checked={selectedTable.isVip ?? false}
                        onCheckedChange={(checked) =>
                          setTablePatch(selectedTable.id, { isVip: checked })
                        }
                        data-testid="switch-vip-table"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Rotation</Label>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 rounded-xl bg-white/70"
                            onClick={() =>
                              setTablePatch(selectedTable.id, {
                                rotation: selectedTable.rotation - 0.15,
                              })
                            }
                            data-testid="button-rotate-left"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 rounded-xl bg-white/70"
                            onClick={() =>
                              setTablePatch(selectedTable.id, {
                                rotation: selectedTable.rotation + 0.15,
                              })
                            }
                            data-testid="button-rotate-right"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                          <div
                            className="min-w-0 flex-1 rounded-xl border bg-white/70 px-3 py-2 text-xs text-muted-foreground"
                            data-testid="text-rotation"
                          >
                            {Math.round((selectedTable.rotation * 180) / Math.PI)}°
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Snap</Label>
                        <div className="flex items-center justify-between rounded-xl border bg-white/70 px-3 py-2">
                          <div className="text-xs text-muted-foreground">Align to grid</div>
                          <Switch
                            checked={snapToGrid}
                            onCheckedChange={setSnapToGrid}
                            data-testid="switch-snap"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border bg-white/60 p-3">
                      <div className="text-xs font-semibold" data-testid="text-shortcuts-title">
                        Shortcuts
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        <span className="font-mono">Del</span> deletes selected table · <span className="font-mono">Esc</span> closes seat popup
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </Card>

            <Card className="glass grain shadow-soft overflow-hidden border-white/40">
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <Save className="h-4 w-4 text-primary" />
                  <div className="text-sm font-semibold" data-testid="text-versions-title">
                    Saved versions
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Save and load different guest lists and table positions.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl bg-white/70 flex-1"
                    onClick={() => {
                      const currentVersion: SavedVersion = {
                        id: uid("temp"),
                        name: versionName.trim() || "Current plan",
                        savedAt: new Date().toISOString(),
                        guests: JSON.parse(JSON.stringify(guests)),
                        tables: JSON.parse(JSON.stringify(tables)),
                        stageSize: { ...stageSize },
                        pan: { ...pan },
                      };
                      exportVersion(currentVersion, false);
                    }}
                    data-testid="button-export-current"
                  >
                    <Download className="mr-1.5 h-4 w-4" />
                    Export
                  </Button>
                  <label className="flex-1">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportFile}
                      className="hidden"
                      data-testid="input-import-file"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl bg-white/70 w-full"
                      onClick={() => {
                        const input = document.querySelector('[data-testid="input-import-file"]') as HTMLInputElement;
                        input?.click();
                      }}
                      data-testid="button-import"
                    >
                      <Upload className="mr-1.5 h-4 w-4" />
                      Import
                    </Button>
                  </label>
                </div>
                <div className="mt-3 space-y-2">
                  <Label className="text-xs text-muted-foreground">Save to</Label>
                  <Select
                    value={saveDestination}
                    onValueChange={(v) => setSaveDestination(v as SaveDestination)}
                    data-testid="select-save-destination"
                  >
                    <SelectTrigger className="rounded-xl bg-white/70">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="server">Server (default)</SelectItem>
                      <SelectItem value="local">This device only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="mt-4 flex gap-2">
                  <Input
                    placeholder="Version name"
                    value={versionName}
                    onChange={(e) => setVersionName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveCurrentVersion(versionName)}
                    className="rounded-xl bg-white/70 flex-1"
                    data-testid="input-version-name"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl bg-white/70 shrink-0"
                    onClick={() => saveCurrentVersion(versionName)}
                    disabled={serverSaveLoading}
                    data-testid="button-save-version"
                  >
                    <Save className="mr-1.5 h-4 w-4" />
                    {serverSaveLoading ? "Saving…" : "Save"}
                  </Button>
                </div>
                <div className="mt-3 space-y-3">
                  {serverVersionsLoading ? (
                    <div className="rounded-xl border bg-white/60 p-3 text-xs text-muted-foreground">
                      Loading server versions…
                    </div>
                  ) : serverVersions.length > 0 ? (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">On server</Label>
                      <div className="space-y-1.5 max-h-32 overflow-y-auto" data-testid="list-server-versions">
                        {serverVersions.map((v) => (
                          <div
                            key={v.id}
                            className="flex items-center justify-between gap-2 rounded-xl border bg-white/70 px-3 py-2"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold truncate">{v.name}</div>
                              <div className="text-[11px] text-muted-foreground">
                                {new Date(v.savedAt).toLocaleString()}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => exportVersion(v, true)}
                                title="Export version"
                                data-testid={`button-export-server-version-${v.id}`}
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => loadServerVersion(v.id)}
                                data-testid={`button-load-server-version-${v.id}`}
                              >
                                Load
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => deleteServerVersion(v.id)}
                                data-testid={`button-delete-server-version-${v.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {savedVersions.length > 0 ? (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">On this device</Label>
                      <div className="space-y-1.5 max-h-32 overflow-y-auto" data-testid="list-saved-versions">
                        {savedVersions.map((v) => (
                          <div
                            key={v.id}
                            className="flex items-center justify-between gap-2 rounded-xl border bg-white/70 px-3 py-2"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold truncate">{v.name}</div>
                              <div className="text-[11px] text-muted-foreground">
                                {new Date(v.savedAt).toLocaleString()}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => exportVersion(v, false)}
                                title="Export version"
                                data-testid={`button-export-local-version-${v.id}`}
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => loadLocalVersion(v.id)}
                                data-testid={`button-load-version-${v.id}`}
                              >
                                Load
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => deleteLocalVersion(v.id)}
                                data-testid={`button-delete-version-${v.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {!serverVersionsLoading && serverVersions.length === 0 && savedVersions.length === 0 ? (
                    <div className="rounded-xl border bg-white/60 p-3 text-xs text-muted-foreground">
                      No saved versions yet. Name and save to create one (default: server).
                    </div>
                  ) : null}
                </div>
              </div>
            </Card>

            <Card className="glass grain shadow-soft overflow-hidden border-white/40">
              <div className="p-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <div className="text-sm font-semibold" data-testid="text-guestlist-title">
                        Guest list
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      By table · Click a seat to assign.
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full bg-white/70"
                      onClick={exportToCsv}
                      data-testid="button-export-csv"
                    >
                      <Download className="mr-1.5 h-4 w-4" />
                      Export CSV
                    </Button>
                    <Popover open={isGuestFormOpen} onOpenChange={setIsGuestFormOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="rounded-full bg-white/70"
                          data-testid="button-add-guest"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add guest
                        </Button>
                      </PopoverTrigger>
                    <PopoverContent className="w-80 p-4">
                      <div className="space-y-4">
                        <h4 className="font-medium leading-none">Add Guest</h4>
                        <div className="grid gap-2">
                          <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="title">Title</Label>
                            <Input
                              id="title"
                              className="col-span-2 h-8"
                              value={newGuest.title}
                              onChange={(e) => setNewGuest({ ...newGuest, title: e.target.value })}
                            />
                          </div>
                          <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input
                              id="firstName"
                              className="col-span-2 h-8"
                              value={newGuest.firstName}
                              onChange={(e) => setNewGuest({ ...newGuest, firstName: e.target.value })}
                            />
                          </div>
                          <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input
                              id="lastName"
                              className="col-span-2 h-8"
                              value={newGuest.lastName}
                              onChange={(e) => setNewGuest({ ...newGuest, lastName: e.target.value })}
                            />
                          </div>
                          <div className="grid grid-cols-3 items-center gap-4">
                            <Label>Gender</Label>
                            <Select
                              value={newGuest.gender}
                              onValueChange={(v) => setNewGuest({ ...newGuest, gender: v as GuestGender })}
                            >
                              <SelectTrigger className="col-span-2 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="male">Male</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button
                          className="w-full"
                          onClick={() => {
                            const id = uid("g");
                            setGuests((p) => [
                              ...p,
                              {
                                id,
                                name: `${newGuest.title} ${newGuest.firstName} ${newGuest.lastName}`.trim() || `Guest ${p.length + 1}`,
                                gender: newGuest.gender,
                              },
                            ]);
                            setNewGuest({ title: "", firstName: "", lastName: "", gender: "female" });
                            setIsGuestFormOpen(false);
                          }}
                        >
                          Save Guest
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                  </div>
                </div>

                <div className="mt-4">
                  <Label className="text-xs text-muted-foreground">Unassigned</Label>
                  <div className="mt-2 space-y-2" data-testid="list-unassigned-guests">
                    {unassignedGuests.length === 0 ? (
                      <div className="rounded-xl border bg-white/60 p-3 text-xs text-muted-foreground">
                        All guests are assigned.
                      </div>
                    ) : (
                      unassignedGuests.slice(0, 8).map((g) => (
                        <div
                          key={g.id}
                          draggable
                          onDragStart={() => setDraggedGuestId(g.id)}
                          onDragEnd={() => setDraggedGuestId(null)}
                          className="cursor-grab active:cursor-grabbing rounded-xl border bg-white/70 p-2.5 hover:border-primary/50 transition-colors"
                          data-testid={`card-guest-${g.id}`}
                        >
                          <GuestChip guest={g} onRemove={() => removeGuest(g.id)} />
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <Separator className="my-4" />

                <div>
                  <Label className="text-xs text-muted-foreground">By table</Label>
                  <div className="mt-2 space-y-3" data-testid="list-guests-by-table">
                    {guestsByTable.map(({ tableId, tableNumber, shape, isVip, seats }) => {
                      const assignedSeats = seats.filter((s) => s.guest);
                      return (
                        <div
                          key={tableId}
                          className={cn(
                            "rounded-xl border overflow-hidden transition",
                            isVip ? "bg-amber-50/80 border-amber-200/60" : "bg-white/70",
                            selectedTableId === tableId && "ring-2 ring-primary/30",
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedTableId(tableId)}
                            className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-white/50"
                            data-testid={`button-select-table-${tableId}`}
                          >
                            <span className="flex items-center gap-1.5 text-xs font-semibold">
                              Table {tableNumber}
                              {isVip && (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                  <Crown className="h-2.5 w-2.5" />
                                  VIP
                                </span>
                              )}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {assignedSeats.length}/{seats.length} · {shape}
                            </span>
                          </button>
                          <div className="border-t border-black/5 px-3 py-2 space-y-1.5">
                            {seats.map(({ chairId, seatNumber, guest }) => (
                              <div
                                key={`${tableId}-${chairId}`}
                                className="flex items-center gap-2 text-xs group/row"
                              >
                                <span className="w-6 shrink-0 text-[11px] text-muted-foreground">
                                  {seatNumber}.
                                </span>
                                {guest ? (
                                  <>
                                    <span className="truncate font-medium flex-1 min-w-0" data-testid={`guest-table-${tableId}-seat-${seatNumber}`}>
                                      {guest.name}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 shrink-0 opacity-0 group-hover/row:opacity-100 text-muted-foreground hover:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        assignGuest(tableId, chairId, undefined);
                                      }}
                                      title="Remove from table (move to unassigned)"
                                      data-testid={`button-remove-guest-from-table-${tableId}-${chairId}`}
                                    >
                                      <UserMinus className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                ) : (
                                  <span className="text-muted-foreground italic">—</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
            className="space-y-4"
          >
            {availableTour ? (
              <Card className="shadow-soft overflow-hidden border-white/40">
                <div className="relative">
                  <iframe
                    title="D & R Venue 3D Tour"
                    src={TOUR_URL}
                    className="h-[360px] w-full"
                    allow="fullscreen; xr-spatial-tracking; accelerometer; gyroscope;" 
                    referrerPolicy="no-referrer"
                    data-testid="iframe-venue-tour"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3">
                    <div className="glass grain inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold">
                      Use the tour to orient the room, then place tables on the plan below.
                    </div>
                  </div>
                </div>
              </Card>
            ) : null}

            <Card className="shadow-soft overflow-hidden border-white/40">
              <div className="flex items-center justify-between border-b bg-white/70 px-4 py-3">
                <div>
                  <div className="text-sm font-semibold" data-testid="text-stage-title">
                    Floor plan
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {tool === "pan" ? "Drag empty space to pan." : "Drag a table to move it."}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Grid</Label>
                    <Switch
                      checked={showGrid}
                      onCheckedChange={setShowGrid}
                      data-testid="switch-grid"
                    />
                  </div>
                </div>
              </div>

              <div
                ref={stageRef}
                className={cn(
                  "relative overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.75),rgba(255,255,255,0.62))]",
                  stageOverlay,
                )}
                style={{ width: stageSize.w, height: stageSize.h }}
                onPointerDown={onStagePointerDown}
                onPointerMove={(e) => {
                  onStagePointerMove(e);
                  moveDrag(e);
                }}
                onPointerUp={() => {
                  onStagePointerUp();
                  endDrag();
                }}
                data-testid="stage-floorplan"
              >
                {/* Resize Handle */}
                <div
                  className="absolute bottom-0 right-0 z-50 h-6 w-6 cursor-nwse-resize bg-primary/20 hover:bg-primary/40"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setResizingStage(true);
                  }}
                />
                <div
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_400px_at_70%_0%,rgba(251,191,36,0.18),transparent_55%),radial-gradient(600px_400px_at_0%_60%,rgba(59,130,246,0.12),transparent_60%)]"
                />

                <div
                  className="absolute inset-0"
                  style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
                  data-testid="layer-pan"
                >
                  {tables.map((t) => {
                    const isSelected = t.id === selectedTableId;
                    const tableSize = t.shape === "rect" ? { w: 126, h: 74 } : { w: 98, h: 98 };
                    const chairRadius = t.shape === "rect" ? 80 : 70;

                    return (
                      <div
                        key={t.id}
                        className={cn(
                          "absolute select-none",
                          tool === "select" ? "cursor-grab active:cursor-grabbing" : "cursor-default",
                        )}
                        style={{
                          left: t.x,
                          top: t.y,
                          transform: `translate(-50%, -50%) rotate(${t.rotation}rad)`,
                        }}
                        onPointerDown={(e) => startDrag(t.id, e)}
                        onDoubleClick={() => setSelectedTableId(t.id)}
                        data-testid={`table-${t.id}`}
                        role="button"
                        tabIndex={0}
                      >
                        <div
                          className={cn(
                            "relative grid place-items-center",
                            isSelected ? "" : "opacity-95",
                          )}
                        >
                          {t.shape === "round" ? (
                            <div
                              className={cn(
                                "relative grid place-items-center rounded-full bg-white shadow-soft ring-1",
                                isSelected
                                  ? "ring-primary/35"
                                  : (t.isVip ? "ring-2 ring-amber-400/70" : "ring-black/10"),
                              )}
                              style={{ width: tableSize.w, height: tableSize.h }}
                            >
                              <div className={cn(
                                "pointer-events-none absolute inset-0 rounded-full",
                                t.isVip
                                  ? "bg-[radial-gradient(circle_at_30%_20%,rgba(251,191,36,0.28),transparent_55%),radial-gradient(circle_at_70%_60%,rgba(245,158,11,0.15),transparent_60%)]"
                                  : "bg-[radial-gradient(circle_at_30%_20%,rgba(251,191,36,0.18),transparent_55%),radial-gradient(circle_at_70%_60%,rgba(59,130,246,0.12),transparent_60%)]",
                              )} />
                              <div className="pointer-events-none absolute inset-[10px] rounded-full border border-black/5" />
                              <div className="pointer-events-none flex flex-col items-center justify-center gap-1">
                                <TableBadge number={t.number} style={t.numberStyle} />
                                {t.isVip && (
                                  <div className="flex items-center gap-1 rounded-full bg-amber-500/95 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                                    <Crown className="h-3 w-3" />
                                    VIP
                                  </div>
                                )}
                              </div>
                              <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2">
                                <div
                                  className={cn(
                                    "rounded-full border bg-white/80 px-2 py-0.5 text-[11px] font-semibold shadow-sm",
                                    isSelected ? "" : "opacity-0 group-hover:opacity-100",
                                  )}
                                >
                                  {t.chairs.filter((c) => c.guestId).length}/{t.chairs.length}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div
                              className={cn(
                                "relative grid place-items-center rounded-2xl bg-white shadow-soft ring-1",
                                isSelected
                                  ? "ring-primary/35"
                                  : (t.isVip ? "ring-2 ring-amber-400/70" : "ring-black/10"),
                              )}
                              style={{ width: tableSize.w, height: tableSize.h }}
                            >
                              <div className={cn(
                                "pointer-events-none absolute inset-0 rounded-2xl",
                                t.isVip
                                  ? "bg-[linear-gradient(135deg,rgba(251,191,36,0.28),rgba(255,255,255,0)_55%),radial-gradient(400px_200px_at_70%_80%,rgba(245,158,11,0.18),transparent_60%)]"
                                  : "bg-[linear-gradient(135deg,rgba(251,191,36,0.18),rgba(255,255,255,0)_55%),radial-gradient(400px_200px_at_70%_80%,rgba(59,130,246,0.12),transparent_60%)]",
                              )} />
                              <div className="pointer-events-none absolute inset-1 rounded-2xl border border-black/5" />
                              <div className="pointer-events-none flex flex-col items-center justify-center gap-1">
                                <TableBadge number={t.number} style={t.numberStyle} />
                                {t.isVip && (
                                  <div className="flex items-center gap-1 rounded-full bg-amber-500/95 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                                    <Crown className="h-3 w-3" />
                                    VIP
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="pointer-events-none absolute inset-0">
                            {t.chairs.map((c, i) =>
                              t.shape === "rect" ? (
                                <ChairRect
                                  key={c.id}
                                  index={i}
                                  total={t.chairs.length}
                                  w={126}
                                  h={74}
                                />
                              ) : (
                                <ChairDot
                                  key={c.id}
                                  index={i}
                                  total={t.chairs.length}
                                  radius={chairRadius}
                                  rotation={t.rotation}
                                />
                              ),
                            )}
                          </div>

                          <div className="absolute inset-0">
                            {t.chairs.map((c, i) => {
                              const total = t.chairs.length;
                              const angle = t.shape === "round" ? ((Math.PI * 2) / total) * i + t.rotation : 0;
                              const r = t.shape === "round" ? chairRadius : 0;

                              let seatX = 0;
                              let seatY = 0;
                              if (t.shape === "round") {
                                seatX = Math.cos(angle) * r;
                                seatY = Math.sin(angle) * r;
                              } else {
                                const perSide = Math.ceil(total / 4);
                                const side = Math.floor(i / perSide);
                                const posOnSide = i % perSide;
                                const tt = perSide <= 1 ? 0.5 : posOnSide / (perSide - 1);
                                const w = 126;
                                const h = 74;
                                if (side === 0) {
                                  seatX = -w / 2 + tt * w;
                                  seatY = -h / 2 - 18;
                                } else if (side === 1) {
                                  seatX = w / 2 + 18;
                                  seatY = -h / 2 + tt * h;
                                } else if (side === 2) {
                                  seatX = -w / 2 + tt * w;
                                  seatY = h / 2 + 18;
                                } else {
                                  seatX = -w / 2 - 18;
                                  seatY = -h / 2 + tt * h;
                                }
                              }

                              const guest = c.guestId ? guests.find((g) => g.id === c.guestId) : undefined;

                              return (
                                <Popover
                                  key={c.id}
                                  open={
                                    !!activeSeat &&
                                    activeSeat.tableId === t.id &&
                                    activeSeat.chairId === c.id
                                  }
                                  onOpenChange={(open) =>
                                    setActiveSeat(open ? { tableId: t.id, chairId: c.id } : null)
                                  }
                                >
                                  <PopoverTrigger asChild>
                                    <span className="inline-block">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            className={cn(
                                              "absolute grid h-7 w-7 place-items-center rounded-full border text-[10px] font-semibold shadow-sm transition",
                                              guest
                                                ? "bg-foreground text-background border-black/10"
                                                : "bg-white/90 hover:bg-white border-black/10",
                                              draggedGuestId && !guest && "ring-2 ring-primary ring-offset-2 bg-primary/10 animate-pulse"
                                            )}
                                            style={{
                                              left: `calc(50% + ${seatX}px)` ,
                                              top: `calc(50% + ${seatY}px)` ,
                                              transform: "translate(-50%, -50%)",
                                            }}
                                            onDragOver={(e) => {
                                              if (draggedGuestId && !guest) {
                                                e.preventDefault();
                                              }
                                            }}
                                            onDrop={(e) => {
                                              if (draggedGuestId && !guest) {
                                                e.preventDefault();
                                                assignGuest(t.id, c.id, draggedGuestId);
                                                setDraggedGuestId(null);
                                              }
                                            }}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedTableId(t.id);
                                            }}
                                            data-testid={`button-seat-${t.id}-${c.id}`}
                                          >
                                            {guest ? initials(guest.name) : i + 1}
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-[200px]">
                                          {guest ? guest.name : `Seat ${i + 1} (empty)`}
                                        </TooltipContent>
                                      </Tooltip>
                                    </span>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    align="center"
                                    className="w-[320px] rounded-2xl p-0 shadow-soft"
                                    data-testid={`popover-seat-${t.id}-${c.id}`}
                                  >
                                    <div className="p-3">
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <div className="text-xs font-semibold text-muted-foreground">
                                            Table {t.number} · Seat {i + 1}
                                          </div>
                                          <div className="mt-0.5 text-sm font-semibold">
                                            Assign guest
                                          </div>
                                        </div>
                                        {guest ? (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-9 gap-1.5 text-destructive hover:text-destructive"
                                            onClick={() => assignGuest(t.id, c.id, undefined)}
                                            data-testid={`button-clear-seat-${t.id}-${c.id}`}
                                          >
                                            <UserMinus className="h-4 w-4" />
                                            Move to unassigned
                                          </Button>
                                        ) : null}
                                      </div>

                                      <div className="mt-3 space-y-2">
                                        {guest ? (
                                          <div className="rounded-xl border bg-white/70 p-2.5">
                                            <GuestChip guest={guest} />
                                          </div>
                                        ) : (
                                          <div className="rounded-xl border bg-white/70 p-2.5 text-xs text-muted-foreground">
                                            No guest assigned yet.
                                          </div>
                                        )}

                                        <div className="rounded-xl border bg-white/70 p-2.5">
                                          <div className="text-xs font-semibold" data-testid={`text-pick-guest-${t.id}-${c.id}`}>
                                            Pick from unassigned
                                          </div>
                                          <div className="mt-2 grid grid-cols-1 gap-2">
                                            {unassignedGuests.slice(0, 6).map((g) => (
                                              <button
                                                key={g.id}
                                                onClick={() => assignGuest(t.id, c.id, g.id)}
                                                className="rounded-xl border bg-white/70 p-2.5 text-left transition hover:bg-white"
                                                data-testid={`button-assign-guest-${t.id}-${c.id}-${g.id}`}
                                              >
                                                <GuestChip guest={g} />
                                              </button>
                                            ))}
                                            {unassignedGuests.length === 0 ? (
                                              <div className="text-xs text-muted-foreground">
                                                No unassigned guests.
                                              </div>
                                            ) : null}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pointer-events-none absolute left-4 top-4">
                  <div className="glass grain inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold">
                    {tool === "pan" ? (
                      <>
                        <Hand className="h-3.5 w-3.5 text-primary" /> Pan mode
                      </>
                    ) : (
                      <>
                        <LayoutGrid className="h-3.5 w-3.5 text-primary" /> Drag tables
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
