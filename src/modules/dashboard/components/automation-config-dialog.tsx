import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { NativeSelect } from "@/components/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addMinutes, addHours, format } from "date-fns";
import type { AutomationItem } from "../hooks/useAutomations";
import { getPatientsForAutomation, updatePatientAutomationStatus, type PatientAutomation } from "@/services/sqlite/automations";

interface AutomationConfigDialogProps {
  automation: AutomationItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, data: Partial<AutomationItem>) => void;
}

export function AutomationConfigDialog({
  automation,
  isOpen,
  onClose,
  onSave,
}: AutomationConfigDialogProps) {
  const [active, setActive] = useState(true);
  const [remindIn, setRemindIn] = useState("never");
  const [patients, setPatients] = useState<PatientAutomation[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);

  // Sync state when dialog opens with a new automation
  useEffect(() => {
    if (automation && isOpen) {
      setActive(automation.active);
      setRemindIn("never");
      fetchPatients(automation.id);
    }
  }, [automation, isOpen]);

  const fetchPatients = async (automationId: string) => {
    setIsLoadingPatients(true);
    try {
      const data = await getPatientsForAutomation(automationId);
      setPatients(data);
    } catch (error) {
      console.error("Failed to load patients for automation", error);
    } finally {
      setIsLoadingPatients(false);
    }
  };

  const handlePatientToggle = async (patientAutoId: string, isActive: boolean) => {
    try {
      await updatePatientAutomationStatus(patientAutoId, isActive);
      setPatients(prev => 
        prev.map(p => p.id === patientAutoId ? { ...p, is_active: isActive } : p)
      );
    } catch (error) {
      console.error("Failed to update patient automation", error);
    }
  };

  const handleSave = () => {
    if (!automation) return;

    const update: Partial<AutomationItem> = {
      active,
    };

    if (remindIn !== "never") {
      const now = new Date();
      let nextDate = now;
      if (remindIn === "1m") nextDate = addMinutes(now, 1);
      if (remindIn === "5m") nextDate = addMinutes(now, 5);
      if (remindIn === "1h") nextDate = addHours(now, 1);
      if (remindIn === "tomorrow") nextDate = addHours(now, 24);

      update.nextRunISO = nextDate.toISOString();
      
      const formatRelative = {
        "1m": "Dans 1 minute",
        "5m": "Dans 5 minutes",
        "1h": "Dans 1 heure",
        "tomorrow": "Demain",
      };
      
      update.nextRunRelative = formatRelative[remindIn as keyof typeof formatRelative];
      update.nextRunDate = format(nextDate, "dd MMM yyyy, HH:mm");
      update.lastRunStatus = "Scheduled" as "Scheduled";
    }

    onSave(automation.id, update);
    onClose();
  };

  if (!automation) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configurer l'automatisation</DialogTitle>
          <DialogDescription>
            Modifier les paramètres pour "{automation.title}"
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">Général</TabsTrigger>
            <TabsTrigger value="patients">Patients Ciblés</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-4 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <Label htmlFor="active" className="text-base font-semibold">
                  Statut Global
                </Label>
                <p className="text-sm text-muted-foreground">
                  Activer ou désactiver cette tâche pour tous.
                </p>
              </div>
              <Switch
                id="active"
                checked={active}
                onCheckedChange={setActive}
              />
            </div>

            {active && (
              <div className="flex flex-col gap-3">
                <Label htmlFor="remind" className="text-base font-semibold">
                  Prochaine exécution globale :
                </Label>
                <NativeSelect
                  id="remind"
                  value={remindIn}
                  onChange={(e) => setRemindIn(e.target.value)}
                  className="w-full"
                >
                  <option value="never">Ne rien changer</option>
                  <option value="1m">Dans 1 minute (Test rapide)</option>
                  <option value="5m">Dans 5 minutes</option>
                  <option value="1h">Dans 1 heure</option>
                  <option value="tomorrow">Demain</option>
                </NativeSelect>
                <p className="text-xs text-muted-foreground">
                  Définit la prochaine date d'exécution pour l'ensemble des patients sélectionnés.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="patients" className="mt-4">
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground mb-2">
                Sélectionnez les patients concernés par cette automatisation.
              </p>
              
              <div className="border rounded-md max-h-[300px] overflow-y-auto">
                {isLoadingPatients ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">Chargement...</div>
                ) : patients.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">Aucun patient trouvé.</div>
                ) : (
                  <div className="divide-y">
                    {patients.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3 hover:bg-muted/50">
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{p.patient_name}</span>
                          <span className="text-xs text-muted-foreground">Propriétaire: {p.owner_name}</span>
                        </div>
                        <Switch 
                          checked={p.is_active} 
                          onCheckedChange={(checked) => handlePatientToggle(p.id, checked)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSave}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
