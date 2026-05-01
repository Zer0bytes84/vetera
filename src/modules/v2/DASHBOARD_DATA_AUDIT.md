# Audit des Données du Dashboard - Vérification 100% Données Réelles

## Résumé Exécutif

**✅ TOUS les widgets utilisent des données 100% réelles** provenant des repositories de base de données.

---

## Flux de Données Principal

```
Repositories → buildDashboardMetrics() → Widgets
```

### Repositories Utilisés (src/hooks/use-*-repository.ts)

| Repository | Source de données | Widgets concernés |
|------------|------------------|-------------------|
| `useAppointmentsRepository()` | Table `appointments` | Tous les RDV, planning, statuts |
| `useTransactionsRepository()` | Table `transactions` | Revenus, cashflow, catégories |
| `usePatientsRepository()` | Table `patients` | Rétention, patients actifs |
| `useOwnersRepository()` | Table `owners` | Villes, géographie |
| `useTasksRepository()` | Table `tasks` | Tâches, cadence |

---

## Vérification Widget par Widget

### 1. DashboardWelcomeCard
- **Données**: `appointments` (pour last appointment date)
- **Source**: `useAppointmentsRepository()`
- **✅ Réel**: Oui, date du dernier RDV calculée depuis les vrais RDV

### 2. LeadMetricStrip (4 métriques rapides)
| Métrique | Source | Formule |
|----------|--------|---------|
| **Revenus 30j** | `transactions` (paid + income) | `SUM(amount)` sur 30 derniers jours |
| **Consultations** | `appointments` (completed) | `COUNT` sur 30 derniers jours |
| **Taux conversion** | `appointments` | `% completed / total scheduled` |
| **Panier moyen** | `transactions` | `AVG(amount)` des revenus |

- **✅ Réel**: 100% - Calculé depuis transactions et appointments réels

### 3. LeadRevenuePanel (Graphique revenus avec sélecteur 3m/6m/12m)
- **Données**: `metrics.monthlyRevenue` calculé depuis `transactions`
- **Source**: `useTransactionsRepository()`
- **Périodes**: 12 mois complets calculés depuis les transactions réelles
- **✅ Réel**: Oui, tous les mois sont calculés depuis les transactions avec date

### 4. LeadSegmentationPanel (Répartition par ville)
- **Données**: `metrics.topCities` calculé depuis `appointments` + `owners`
- **Source**: `useAppointmentsRepository()` + `useOwnersRepository()`
- **Calcul**: Agrégation par `owner.city` des appointments non annulés
- **✅ Réel**: Oui, villes réelles des propriétaires

### 5. LeadStatusPanel (Pipeline statuts)
- **Données**: `metrics.pipelineRows` calculé depuis `appointments`
- **Source**: `useAppointmentsRepository()`
- **Statuts**: `scheduled`, `in_progress`, `completed`, `no_show`
- **✅ Réel**: Oui, compte exact des appointments par statut

### 6. WebVisitsPanel (Graphique cashflow 14j)
- **Données**: `metrics.cashflowSeries` calculé depuis `transactions`
- **Source**: `useTransactionsRepository()`
- **Calcul**: `SUM(income) - SUM(expense)` pour chaque jour des 14 derniers jours
- **✅ Réel**: Oui, flux calculé depuis transactions payées

### 7. InsightCard: Revenus (galleryCards[0])
- **Données**: `metrics.summary.incomeToday` + `metrics.monthlyRevenue`
- **Source**: `useTransactionsRepository()`
- **Delta**: `percentageDelta(incomeToday, incomeYesterday)`
- **Chart**: `RevenueBarsChart` avec `metrics.monthlyRevenue`
- **✅ Réel**: Revenus du jour et mois calculés depuis transactions

### 8. InsightCard: Mix Catégories (galleryCards[1])
- **Données**: `metrics.topCategories` calculé depuis `transactions`
- **Source**: `useTransactionsRepository()`
- **Calcul**: Agrégation par `transaction.category`
- **Chart**: `ChannelSourcesChart` avec les vraies catégories
- **✅ Réel**: Catégories réelles des transactions

### 9. InsightCard: Procédures (galleryCards[2])
- **Données**: `metrics.topAppointmentTypes` calculé depuis `appointments`
- **Source**: `useAppointmentsRepository()`
- **Calcul**: `COUNT` par `appointment.type`
- **Chart**: `ItemDemandChart` avec types réels
- **✅ Réel**: Types de RDV réels

### 10. InsightCard: Cashflow (galleryCards[3])
- **Données**: `metrics.cashflowSeries` (14 derniers jours)
- **Source**: `useTransactionsRepository()`
- **Calcul**: `income - expense` pour chaque jour
- **Chart**: `CampaignDataChart` avec série temporelle réelle
- **✅ Réel**: Flux quotidien calculé depuis transactions

### 11. InsightCard: Tâches (galleryCards[4])
- **Données**: `metrics.summary.taskCadenceRate` + `metrics.taskCadenceSeries`
- **Source**: `useTasksRepository()`
- **Calcul**: Taux de complétion sur 24 jours
- **Chart**: `WorkflowPaceChart` avec données réelles de tâches
- **✅ Réel**: Tâches réelles avec status `done` / `todo`

### 12. InsightCard: Rétention (galleryCards[5])
- **Données**: `metrics.summary.currentReturningPatients` + `metrics.activityDays`
- **Source**: `useAppointmentsRepository()` + `usePatientsRepository()`
- **Calcul**: Patients avec >1 RDV dans les 90 derniers jours
- **Chart**: `UserRetentionGrid` avec heatmap des jours
- **✅ Réel**: Retention calculée depuis historique RDV

### 13. InsightCard: Charge (galleryCards[6])
- **Données**: `metrics.activityDays` (84 jours d'activité)
- **Source**: `useAppointmentsRepository()`
- **Calcul**: Moyenne de RDV par jour de la semaine
- **Chart**: `WeeklyLoadChart` avec distribution réelle
- **✅ Réel**: Volume d'appointments réel par jour

### 14. InsightCard: Villes (galleryCards[7])
- **Données**: `metrics.topCities`
- **Source**: `useOwnersRepository()` + `useAppointmentsRepository()`
- **Calcul**: Top 6 villes par nombre d'appointments
- **Chart**: `CityBreakdownChart` avec vraies données géo
- **✅ Réel**: Villes des propriétaires patients

---

## Calculs Clés dans buildDashboardMetrics()

### Revenus
```typescript
const income30 = paidIncome
  .filter(item => date >= last30Start && date <= todayEnd)
  .reduce((sum, item) => sum + item.amount, 0)
```

### Appointments du jour
```typescript
const todayAppointments = appointments
  .filter(item => date >= todayStart && date <= todayEnd 
    && !["cancelled", "no_show"].includes(item.status))
```

### Patients actifs (90j)
```typescript
const currentActivePatients = patients
  .filter(patient => lastVisit >= last90Start && patient.status !== "decede")
```

### Rétention
```typescript
const currentReturningPatients = appointments
  .filter(date >= last90Start && !cancelled/no_show)
  .groupBy(patientId)
  .filter(count > 1)
  .length
```

---

## Vérification de Précision

### Calculs Testés
- [x] Revenus du jour = SUM(transactions WHERE date=today AND status=paid AND type=income)
- [x] Delta revenus = (today - yesterday) / yesterday * 100
- [x] RDV aujourd'hui = COUNT(appointments WHERE startTime=today AND status!=cancelled/no_show)
- [x] Patients actifs = COUNT(patients WHERE lastVisit < 90 days)
- [x] Taux conversion = completed / (completed + scheduled) * 100
- [x] Panier moyen = AVG(transaction.amount WHERE type=income AND status=paid)

### Pas de Données Mock
- ❌ Aucun `Math.random()` dans les calculs
- ❌ Aucune donnée statique ou hardcodée
- ❌ Aucun placeholder "N/A" sauf si base vide
- ✅ Tous les widgets affichent `0` ou message vide si pas de données

---

## Conclusion

**Le dashboard reflète 100% la réalité des données de la base.**

Chaque widget calcule ses métriques depuis :
1. Les repositories réels (transactions, appointments, patients, owners, tasks)
2. Les fonctions de date précises (date-fns)
3. Les agrégations exactes (reduce, filter, map)

Si un widget affiche une valeur incorrecte, c'est que les données en base sont incorrectes ou le calcul a un bug logique - mais pas de données mockées.
