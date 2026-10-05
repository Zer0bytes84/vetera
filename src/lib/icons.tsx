// One 1.5px Hugeicons family. These semantic component aliases let feature
// views keep their public prop contracts while removing the old icon runtimes.
import {
  forwardRef,
  type ForwardRefExoticComponent,
  type RefAttributes,
} from "react";
import {
  HugeiconsIcon,
  type HugeiconsProps,
  type IconSvgElement,
} from "@hugeicons/react";
import {
  CatGlyph,
  DogGlyph,
  RabbitGlyph,
  TurtleGlyph,
  PawPrintGlyph,
} from "./species-icons";
import Activity01IconGlyph from "@hugeicons/core-free-icons/Activity01Icon";
import AlarmClockIconGlyph from "@hugeicons/core-free-icons/AlarmClockIcon";
import InformationCircleIconGlyph from "@hugeicons/core-free-icons/InformationCircleIcon";
import Alert02IconGlyph from "@hugeicons/core-free-icons/Alert02Icon";
import Archive02IconGlyph from "@hugeicons/core-free-icons/Archive02Icon";
import ArrowDown02IconGlyph from "@hugeicons/core-free-icons/ArrowDown02Icon";
import ArrowLeft02IconGlyph from "@hugeicons/core-free-icons/ArrowLeft02Icon";
import ArrowRight02IconGlyph from "@hugeicons/core-free-icons/ArrowRight02Icon";
import ArrowUp02IconGlyph from "@hugeicons/core-free-icons/ArrowUp02Icon";
import ArrowDownRight01IconGlyph from "@hugeicons/core-free-icons/ArrowDownRight01Icon";
import ArrowUpRight01IconGlyph from "@hugeicons/core-free-icons/ArrowUpRight01Icon";
import Refresh01IconGlyph from "@hugeicons/core-free-icons/Refresh01Icon";
import ArrowUpDownIconGlyph from "@hugeicons/core-free-icons/ArrowUpDownIcon";
import UnavailableIconGlyph from "@hugeicons/core-free-icons/UnavailableIcon";
import BandageIconGlyph from "@hugeicons/core-free-icons/BandageIcon";
import Notification01IconGlyph from "@hugeicons/core-free-icons/Notification01Icon";
import BirdIconGlyph from "@hugeicons/core-free-icons/BirdIcon";
import BookOpen01IconGlyph from "@hugeicons/core-free-icons/BookOpen01Icon";
import Package02IconGlyph from "@hugeicons/core-free-icons/Package02Icon";
import Brain02IconGlyph from "@hugeicons/core-free-icons/Brain02Icon";
import Calendar01IconGlyph from "@hugeicons/core-free-icons/Calendar01Icon";
import CalendarCheckIn01IconGlyph from "@hugeicons/core-free-icons/CalendarCheckIn01Icon";
import Calendar03IconGlyph from "@hugeicons/core-free-icons/Calendar03Icon";
import CalendarAdd01IconGlyph from "@hugeicons/core-free-icons/CalendarAdd01Icon";
import CalendarRemove01IconGlyph from "@hugeicons/core-free-icons/CalendarRemove01Icon";
import ChartUpIconGlyph from "@hugeicons/core-free-icons/ChartUpIcon";
import ChartNoAxesColumnIncreasingIconGlyph from "@hugeicons/core-free-icons/ChartNoAxesColumnIncreasingIcon";
import BubbleChatIconGlyph from "@hugeicons/core-free-icons/BubbleChatIcon";
import Tick01IconGlyph from "@hugeicons/core-free-icons/Tick01Icon";
import CheckmarkCircle02IconGlyph from "@hugeicons/core-free-icons/CheckmarkCircle02Icon";
import ArrowDown01IconGlyph from "@hugeicons/core-free-icons/ArrowDown01Icon";
import ArrowLeft01IconGlyph from "@hugeicons/core-free-icons/ArrowLeft01Icon";
import ArrowRight01IconGlyph from "@hugeicons/core-free-icons/ArrowRight01Icon";
import ArrowUp01IconGlyph from "@hugeicons/core-free-icons/ArrowUp01Icon";
import ArrowLeftDoubleIconGlyph from "@hugeicons/core-free-icons/ArrowLeftDoubleIcon";
import ArrowRightDoubleIconGlyph from "@hugeicons/core-free-icons/ArrowRightDoubleIcon";
import CircleIconGlyph from "@hugeicons/core-free-icons/CircleIcon";
import DashedLineCircleIconGlyph from "@hugeicons/core-free-icons/DashedLineCircleIcon";
import Loading03IconGlyph from "@hugeicons/core-free-icons/Loading03Icon";
import ClipboardIconGlyph from "@hugeicons/core-free-icons/ClipboardIcon";
import CheckListIconGlyph from "@hugeicons/core-free-icons/CheckListIcon";
import Clock01IconGlyph from "@hugeicons/core-free-icons/Clock01Icon";
import Coins01IconGlyph from "@hugeicons/core-free-icons/Coins01Icon";
import LayoutTwoColumnIconGlyph from "@hugeicons/core-free-icons/LayoutTwoColumnIcon";
import LayoutThreeColumnIconGlyph from "@hugeicons/core-free-icons/LayoutThreeColumnIcon";
import IdentityCardIconGlyph from "@hugeicons/core-free-icons/IdentityCardIcon";
import Copy01IconGlyph from "@hugeicons/core-free-icons/Copy01Icon";
import DatabaseIconGlyph from "@hugeicons/core-free-icons/DatabaseIcon";
import DoorOpenIconGlyph from "@hugeicons/core-free-icons/DoorOpenIcon";
import PencilEdit01IconGlyph from "@hugeicons/core-free-icons/PencilEdit01Icon";
import MoreVerticalIconGlyph from "@hugeicons/core-free-icons/MoreVerticalIcon";
import ViewIconGlyph from "@hugeicons/core-free-icons/ViewIcon";
import ViewOffIconGlyph from "@hugeicons/core-free-icons/ViewOffIcon";
import FileAddIconGlyph from "@hugeicons/core-free-icons/FileAddIcon";
import File01IconGlyph from "@hugeicons/core-free-icons/File01Icon";
import FirstAidKitIconGlyph from "@hugeicons/core-free-icons/FirstAidKitIcon";
import FishSymbolIconGlyph from "@hugeicons/core-free-icons/FishSymbolIcon";
import Flag01IconGlyph from "@hugeicons/core-free-icons/Flag01Icon";
import FireIconGlyph from "@hugeicons/core-free-icons/FireIcon";
import SaveIconGlyph from "@hugeicons/core-free-icons/SaveIcon";
import Folder01IconGlyph from "@hugeicons/core-free-icons/Folder01Icon";
import FolderOpenIconGlyph from "@hugeicons/core-free-icons/FolderOpenIcon";
import DashboardSquare01IconGlyph from "@hugeicons/core-free-icons/DashboardSquare01Icon";
import DragDropVerticalIconGlyph from "@hugeicons/core-free-icons/DragDropVerticalIcon";
import HardDriveIconGlyph from "@hugeicons/core-free-icons/HardDriveIcon";
import HashtagIconGlyph from "@hugeicons/core-free-icons/HashtagIcon";
import Heading02IconGlyph from "@hugeicons/core-free-icons/Heading02Icon";
import WorkHistoryIconGlyph from "@hugeicons/core-free-icons/WorkHistoryIcon";
import HorseIconGlyph from "@hugeicons/core-free-icons/HorseIcon";
import Hospital01IconGlyph from "@hugeicons/core-free-icons/Hospital01Icon";
import Image01IconGlyph from "@hugeicons/core-free-icons/Image01Icon";
import Key01IconGlyph from "@hugeicons/core-free-icons/Key01Icon";
import BankIconGlyph from "@hugeicons/core-free-icons/BankIcon";
import LaptopIconGlyph from "@hugeicons/core-free-icons/LaptopIcon";
import Idea01IconGlyph from "@hugeicons/core-free-icons/Idea01Icon";
import Menu01IconGlyph from "@hugeicons/core-free-icons/Menu01Icon";
import Mail01IconGlyph from "@hugeicons/core-free-icons/Mail01Icon";
import MailValidation01IconGlyph from "@hugeicons/core-free-icons/MailValidation01Icon";
import Location01IconGlyph from "@hugeicons/core-free-icons/Location01Icon";
import BubbleChatAddIconGlyph from "@hugeicons/core-free-icons/BubbleChatAddIcon";
import Mic01IconGlyph from "@hugeicons/core-free-icons/Mic01Icon";
import MinusSignIconGlyph from "@hugeicons/core-free-icons/MinusSignIcon";
import LaptopPhoneSyncIconGlyph from "@hugeicons/core-free-icons/LaptopPhoneSyncIcon";
import MoreHorizontalIconGlyph from "@hugeicons/core-free-icons/MoreHorizontalIcon";
import NotebookIconGlyph from "@hugeicons/core-free-icons/NotebookIcon";
import AlertDiamondIconGlyph from "@hugeicons/core-free-icons/AlertDiamondIcon";
import PackageDeliveredIconGlyph from "@hugeicons/core-free-icons/PackageDeliveredIcon";
import PackageOpenIconGlyph from "@hugeicons/core-free-icons/PackageOpenIcon";
import TelephoneIconGlyph from "@hugeicons/core-free-icons/TelephoneIcon";
import PieChartIconGlyph from "@hugeicons/core-free-icons/PieChartIcon";
import PillIconGlyph from "@hugeicons/core-free-icons/PillIcon";
import PinIconGlyph from "@hugeicons/core-free-icons/PinIcon";
import PlayIconGlyph from "@hugeicons/core-free-icons/PlayIcon";
import PlayCircle02IconGlyph from "@hugeicons/core-free-icons/PlayCircle02Icon";
import Add01IconGlyph from "@hugeicons/core-free-icons/Add01Icon";
import PrinterIconGlyph from "@hugeicons/core-free-icons/PrinterIcon";
import ReceiptTextIconGlyph from "@hugeicons/core-free-icons/ReceiptTextIcon";
import Undo02IconGlyph from "@hugeicons/core-free-icons/Undo02Icon";
import LayoutThreeRowIconGlyph from "@hugeicons/core-free-icons/LayoutThreeRowIcon";
import BalanceScaleIconGlyph from "@hugeicons/core-free-icons/BalanceScaleIcon";
import Scissor01IconGlyph from "@hugeicons/core-free-icons/Scissor01Icon";
import Search01IconGlyph from "@hugeicons/core-free-icons/Search01Icon";
import SentIconGlyph from "@hugeicons/core-free-icons/SentIcon";
import ServerStack01IconGlyph from "@hugeicons/core-free-icons/ServerStack01Icon";
import Settings02IconGlyph from "@hugeicons/core-free-icons/Settings02Icon";
import Shield01IconGlyph from "@hugeicons/core-free-icons/Shield01Icon";
import SecurityCheckIconGlyph from "@hugeicons/core-free-icons/SecurityCheckIcon";
import Shield02IconGlyph from "@hugeicons/core-free-icons/Shield02Icon";
import ShoppingCart01IconGlyph from "@hugeicons/core-free-icons/ShoppingCart01Icon";
import SparklesIconGlyph from "@hugeicons/core-free-icons/SparklesIcon";
import StarIconGlyph from "@hugeicons/core-free-icons/StarIcon";
import StethoscopeIconGlyph from "@hugeicons/core-free-icons/StethoscopeIcon";
import StopIconGlyph from "@hugeicons/core-free-icons/StopIcon";
import InjectionIconGlyph from "@hugeicons/core-free-icons/InjectionIcon";
import Table01IconGlyph from "@hugeicons/core-free-icons/Table01Icon";
import ThermometerIconGlyph from "@hugeicons/core-free-icons/ThermometerIcon";
import Timer01IconGlyph from "@hugeicons/core-free-icons/Timer01Icon";
import Delete02IconGlyph from "@hugeicons/core-free-icons/Delete02Icon";
import ChartDownIconGlyph from "@hugeicons/core-free-icons/ChartDownIcon";
import Award01IconGlyph from "@hugeicons/core-free-icons/Award01Icon";
import Upload01IconGlyph from "@hugeicons/core-free-icons/Upload01Icon";
import User02IconGlyph from "@hugeicons/core-free-icons/User02Icon";
import UserCircleIconGlyph from "@hugeicons/core-free-icons/UserCircleIcon";
import UserSettings01IconGlyph from "@hugeicons/core-free-icons/UserSettings01Icon";
import UserGroupIconGlyph from "@hugeicons/core-free-icons/UserGroupIcon";
import Wallet01IconGlyph from "@hugeicons/core-free-icons/Wallet01Icon";
import FastWindIconGlyph from "@hugeicons/core-free-icons/FastWindIcon";
import WorkflowSquare01IconGlyph from "@hugeicons/core-free-icons/WorkflowSquare01Icon";
import Cancel01IconGlyph from "@hugeicons/core-free-icons/Cancel01Icon";
import CancelCircleIconGlyph from "@hugeicons/core-free-icons/CancelCircleIcon";
import ZapIconGlyph from "@hugeicons/core-free-icons/ZapIcon";

export type AppIconProps = Omit<
  HugeiconsProps,
  "icon" | "altIcon" | "showAlt" | "strokeWidth"
> & { strokeWidth?: number | string; weight?: string; mirrored?: boolean };
export type AppIcon = ForwardRefExoticComponent<
  AppIconProps & RefAttributes<SVGSVGElement>
>;
export type LucideIcon = AppIcon;
export type Icon = AppIcon;
function iconComponent(name: string, glyph: IconSvgElement): AppIcon {
  const Icon = forwardRef<SVGSVGElement, AppIconProps>(
    (
      { weight: _weight, mirrored, strokeWidth: _strokeWidth, style, ...props },
      ref
    ) => (
      <HugeiconsIcon
        ref={ref}
        icon={glyph}
        strokeWidth={1.5}
        style={mirrored ? { ...style, transform: "scaleX(-1)" } : style}
        {...props}
      />
    )
  );
  Icon.displayName = name;
  return Icon;
}

export const Activity = /* @__PURE__ */ iconComponent(
  "Activity",
  Activity01IconGlyph
);
export const AlarmClock = /* @__PURE__ */ iconComponent(
  "AlarmClock",
  AlarmClockIconGlyph
);
export const AlertCircle = /* @__PURE__ */ iconComponent(
  "AlertCircle",
  InformationCircleIconGlyph
);
export const AlertTriangle = /* @__PURE__ */ iconComponent(
  "AlertTriangle",
  Alert02IconGlyph
);
export const Archive = /* @__PURE__ */ iconComponent(
  "Archive",
  Archive02IconGlyph
);
export const ArrowDown = /* @__PURE__ */ iconComponent(
  "ArrowDown",
  ArrowDown02IconGlyph
);
export const ArrowDownIcon = /* @__PURE__ */ iconComponent(
  "ArrowDownIcon",
  ArrowDown02IconGlyph
);
export const ArrowDownRight = /* @__PURE__ */ iconComponent(
  "ArrowDownRight",
  ArrowDownRight01IconGlyph
);
export const ArrowLeft = /* @__PURE__ */ iconComponent(
  "ArrowLeft",
  ArrowLeft02IconGlyph
);
export const ArrowRight = /* @__PURE__ */ iconComponent(
  "ArrowRight",
  ArrowRight02IconGlyph
);
export const ArrowUp = /* @__PURE__ */ iconComponent(
  "ArrowUp",
  ArrowUp02IconGlyph
);
export const ArrowUpRight = /* @__PURE__ */ iconComponent(
  "ArrowUpRight",
  ArrowUpRight01IconGlyph
);
export const ArrowsClockwise = /* @__PURE__ */ iconComponent(
  "ArrowsClockwise",
  Refresh01IconGlyph
);
export const ArrowsDownUp = /* @__PURE__ */ iconComponent(
  "ArrowsDownUp",
  ArrowUpDownIconGlyph
);
export const Ban = /* @__PURE__ */ iconComponent("Ban", UnavailableIconGlyph);
export const Bandaids = /* @__PURE__ */ iconComponent(
  "Bandaids",
  BandageIconGlyph
);
export const Bell = /* @__PURE__ */ iconComponent(
  "Bell",
  Notification01IconGlyph
);
export const BellRing = /* @__PURE__ */ iconComponent(
  "BellRing",
  Notification01IconGlyph
);
export const Bird = /* @__PURE__ */ iconComponent("Bird", BirdIconGlyph);
export const BookOpen = /* @__PURE__ */ iconComponent(
  "BookOpen",
  BookOpen01IconGlyph
);
export const Box = /* @__PURE__ */ iconComponent("Box", Package02IconGlyph);
export const Brain = /* @__PURE__ */ iconComponent("Brain", Brain02IconGlyph);
export const Calendar = /* @__PURE__ */ iconComponent(
  "Calendar",
  Calendar01IconGlyph
);
export const CalendarBlank = /* @__PURE__ */ iconComponent(
  "CalendarBlank",
  Calendar01IconGlyph
);
export const CalendarCheck = /* @__PURE__ */ iconComponent(
  "CalendarCheck",
  CalendarCheckIn01IconGlyph
);
export const CalendarCheck2 = /* @__PURE__ */ iconComponent(
  "CalendarCheck2",
  CalendarCheckIn01IconGlyph
);
export const CalendarClock = /* @__PURE__ */ iconComponent(
  "CalendarClock",
  Calendar03IconGlyph
);
export const CalendarDays = /* @__PURE__ */ iconComponent(
  "CalendarDays",
  Calendar01IconGlyph
);
export const CalendarPlus = /* @__PURE__ */ iconComponent(
  "CalendarPlus",
  CalendarAdd01IconGlyph
);
export const CalendarRange = /* @__PURE__ */ iconComponent(
  "CalendarRange",
  Calendar01IconGlyph
);
export const CalendarX = /* @__PURE__ */ iconComponent(
  "CalendarX",
  CalendarRemove01IconGlyph
);
export const CalendarX2 = /* @__PURE__ */ iconComponent(
  "CalendarX2",
  CalendarRemove01IconGlyph
);
export const CaretUpDown = /* @__PURE__ */ iconComponent(
  "CaretUpDown",
  ArrowUpDownIconGlyph
);
export const Cat = /* @__PURE__ */ iconComponent("Cat", CatGlyph);
export const ChartLineUp = /* @__PURE__ */ iconComponent(
  "ChartLineUp",
  ChartUpIconGlyph
);
export const ChartNoAxesColumnIncreasing = /* @__PURE__ */ iconComponent(
  "ChartNoAxesColumnIncreasing",
  ChartNoAxesColumnIncreasingIconGlyph
);
export const ChatCircleDots = /* @__PURE__ */ iconComponent(
  "ChatCircleDots",
  BubbleChatIconGlyph
);
export const Check = /* @__PURE__ */ iconComponent("Check", Tick01IconGlyph);
export const CheckCircle = /* @__PURE__ */ iconComponent(
  "CheckCircle",
  CheckmarkCircle02IconGlyph
);
export const CheckCircle2 = /* @__PURE__ */ iconComponent(
  "CheckCircle2",
  CheckmarkCircle02IconGlyph
);
export const CheckIcon = /* @__PURE__ */ iconComponent(
  "CheckIcon",
  Tick01IconGlyph
);
export const ChevronDown = /* @__PURE__ */ iconComponent(
  "ChevronDown",
  ArrowDown01IconGlyph
);
export const ChevronDownIcon = /* @__PURE__ */ iconComponent(
  "ChevronDownIcon",
  ArrowDown01IconGlyph
);
export const ChevronLeft = /* @__PURE__ */ iconComponent(
  "ChevronLeft",
  ArrowLeft01IconGlyph
);
export const ChevronLeftIcon = /* @__PURE__ */ iconComponent(
  "ChevronLeftIcon",
  ArrowLeft01IconGlyph
);
export const ChevronRight = /* @__PURE__ */ iconComponent(
  "ChevronRight",
  ArrowRight01IconGlyph
);
export const ChevronRightIcon = /* @__PURE__ */ iconComponent(
  "ChevronRightIcon",
  ArrowRight01IconGlyph
);
export const ChevronUp = /* @__PURE__ */ iconComponent(
  "ChevronUp",
  ArrowUp01IconGlyph
);
export const ChevronUpIcon = /* @__PURE__ */ iconComponent(
  "ChevronUpIcon",
  ArrowUp01IconGlyph
);
export const ChevronsLeft = /* @__PURE__ */ iconComponent(
  "ChevronsLeft",
  ArrowLeftDoubleIconGlyph
);
export const ChevronsRight = /* @__PURE__ */ iconComponent(
  "ChevronsRight",
  ArrowRightDoubleIconGlyph
);
export const Circle = /* @__PURE__ */ iconComponent("Circle", CircleIconGlyph);
export const CircleCheckBig = /* @__PURE__ */ iconComponent(
  "CircleCheckBig",
  CheckmarkCircle02IconGlyph
);
export const CircleCheckIcon = /* @__PURE__ */ iconComponent(
  "CircleCheckIcon",
  CheckmarkCircle02IconGlyph
);
export const CircleDashed = /* @__PURE__ */ iconComponent(
  "CircleDashed",
  DashedLineCircleIconGlyph
);
export const CircleNotch = /* @__PURE__ */ iconComponent(
  "CircleNotch",
  Loading03IconGlyph
);
export const Clipboard = /* @__PURE__ */ iconComponent(
  "Clipboard",
  ClipboardIconGlyph
);
export const ClipboardCheck = /* @__PURE__ */ iconComponent(
  "ClipboardCheck",
  CheckListIconGlyph
);
export const ClipboardList = /* @__PURE__ */ iconComponent(
  "ClipboardList",
  CheckListIconGlyph
);
export const ClipboardText = /* @__PURE__ */ iconComponent(
  "ClipboardText",
  ClipboardIconGlyph
);
export const Clock = /* @__PURE__ */ iconComponent("Clock", Clock01IconGlyph);
export const Clock3 = /* @__PURE__ */ iconComponent("Clock3", Clock01IconGlyph);
export const Clock4 = /* @__PURE__ */ iconComponent("Clock4", Clock01IconGlyph);
export const Coins = /* @__PURE__ */ iconComponent("Coins", Coins01IconGlyph);
export const Columns2 = /* @__PURE__ */ iconComponent(
  "Columns2",
  LayoutTwoColumnIconGlyph
);
export const Columns3 = /* @__PURE__ */ iconComponent(
  "Columns3",
  LayoutThreeColumnIconGlyph
);
export const ContactRound = /* @__PURE__ */ iconComponent(
  "ContactRound",
  IdentityCardIconGlyph
);
export const Copy = /* @__PURE__ */ iconComponent("Copy", Copy01IconGlyph);
export const Database = /* @__PURE__ */ iconComponent(
  "Database",
  DatabaseIconGlyph
);
export const Dog = /* @__PURE__ */ iconComponent("Dog", DogGlyph);
export const DoorOpen = /* @__PURE__ */ iconComponent(
  "DoorOpen",
  DoorOpenIconGlyph
);
export const Edit3 = /* @__PURE__ */ iconComponent(
  "Edit3",
  PencilEdit01IconGlyph
);
export const EllipsisVertical = /* @__PURE__ */ iconComponent(
  "EllipsisVertical",
  MoreVerticalIconGlyph
);
export const Eye = /* @__PURE__ */ iconComponent("Eye", ViewIconGlyph);
export const EyeOff = /* @__PURE__ */ iconComponent("EyeOff", ViewOffIconGlyph);
export const FilePlus = /* @__PURE__ */ iconComponent(
  "FilePlus",
  FileAddIconGlyph
);
export const FileText = /* @__PURE__ */ iconComponent(
  "FileText",
  File01IconGlyph
);
export const FirstAid = /* @__PURE__ */ iconComponent(
  "FirstAid",
  FirstAidKitIconGlyph
);
export const Fish = /* @__PURE__ */ iconComponent("Fish", FishSymbolIconGlyph);
export const Flag = /* @__PURE__ */ iconComponent("Flag", Flag01IconGlyph);
export const Flame = /* @__PURE__ */ iconComponent("Flame", FireIconGlyph);
export const FloppyDisk = /* @__PURE__ */ iconComponent(
  "FloppyDisk",
  SaveIconGlyph
);
export const Folder = /* @__PURE__ */ iconComponent(
  "Folder",
  Folder01IconGlyph
);
export const FolderOpen = /* @__PURE__ */ iconComponent(
  "FolderOpen",
  FolderOpenIconGlyph
);
export const Grid2X2 = /* @__PURE__ */ iconComponent(
  "Grid2X2",
  DashboardSquare01IconGlyph
);
export const GripVertical = /* @__PURE__ */ iconComponent(
  "GripVertical",
  DragDropVerticalIconGlyph
);
export const HardDrive = /* @__PURE__ */ iconComponent(
  "HardDrive",
  HardDriveIconGlyph
);
export const Hash = /* @__PURE__ */ iconComponent("Hash", HashtagIconGlyph);
export const Heading2 = /* @__PURE__ */ iconComponent(
  "Heading2",
  Heading02IconGlyph
);
export const Heartbeat = /* @__PURE__ */ iconComponent(
  "Heartbeat",
  Activity01IconGlyph
);
export const History = /* @__PURE__ */ iconComponent(
  "History",
  WorkHistoryIconGlyph
);
export const Horse = /* @__PURE__ */ iconComponent("Horse", HorseIconGlyph);
export const Hospital = /* @__PURE__ */ iconComponent(
  "Hospital",
  Hospital01IconGlyph
);
export const IdentificationBadge = /* @__PURE__ */ iconComponent(
  "IdentificationBadge",
  IdentityCardIconGlyph
);
export const Image = /* @__PURE__ */ iconComponent("Image", Image01IconGlyph);
export const Info = /* @__PURE__ */ iconComponent(
  "Info",
  InformationCircleIconGlyph
);
export const InfoIcon = /* @__PURE__ */ iconComponent(
  "InfoIcon",
  InformationCircleIconGlyph
);
export const KeyRound = /* @__PURE__ */ iconComponent(
  "KeyRound",
  Key01IconGlyph
);
export const Landmark = /* @__PURE__ */ iconComponent(
  "Landmark",
  BankIconGlyph
);
export const Laptop2 = /* @__PURE__ */ iconComponent(
  "Laptop2",
  LaptopIconGlyph
);
export const LayoutGrid = /* @__PURE__ */ iconComponent(
  "LayoutGrid",
  DashboardSquare01IconGlyph
);
export const Lightbulb = /* @__PURE__ */ iconComponent(
  "Lightbulb",
  Idea01IconGlyph
);
export const List = /* @__PURE__ */ iconComponent("List", Menu01IconGlyph);
export const ListChecks = /* @__PURE__ */ iconComponent(
  "ListChecks",
  CheckListIconGlyph
);
export const ListTodo = /* @__PURE__ */ iconComponent(
  "ListTodo",
  CheckListIconGlyph
);
export const Loader = /* @__PURE__ */ iconComponent(
  "Loader",
  Loading03IconGlyph
);
export const Loader2 = /* @__PURE__ */ iconComponent(
  "Loader2",
  Loading03IconGlyph
);
export const Loader2Icon = /* @__PURE__ */ iconComponent(
  "Loader2Icon",
  Loading03IconGlyph
);
export const Mail = /* @__PURE__ */ iconComponent("Mail", Mail01IconGlyph);
export const MailCheck = /* @__PURE__ */ iconComponent(
  "MailCheck",
  MailValidation01IconGlyph
);
export const MapPin = /* @__PURE__ */ iconComponent(
  "MapPin",
  Location01IconGlyph
);
export const MessageSquarePlus = /* @__PURE__ */ iconComponent(
  "MessageSquarePlus",
  BubbleChatAddIconGlyph
);
export const Microphone = /* @__PURE__ */ iconComponent(
  "Microphone",
  Mic01IconGlyph
);
export const Minus = /* @__PURE__ */ iconComponent("Minus", MinusSignIconGlyph);
export const MinusIcon = /* @__PURE__ */ iconComponent(
  "MinusIcon",
  MinusSignIconGlyph
);
export const MonitorSmartphone = /* @__PURE__ */ iconComponent(
  "MonitorSmartphone",
  LaptopPhoneSyncIconGlyph
);
export const MoreHorizontal = /* @__PURE__ */ iconComponent(
  "MoreHorizontal",
  MoreHorizontalIconGlyph
);
export const MoreHorizontalIcon = /* @__PURE__ */ iconComponent(
  "MoreHorizontalIcon",
  MoreHorizontalIconGlyph
);
export const MoreVertical = /* @__PURE__ */ iconComponent(
  "MoreVertical",
  MoreVerticalIconGlyph
);
export const Notebook = /* @__PURE__ */ iconComponent(
  "Notebook",
  NotebookIconGlyph
);
export const OctagonXIcon = /* @__PURE__ */ iconComponent(
  "OctagonXIcon",
  AlertDiamondIconGlyph
);
export const Package = /* @__PURE__ */ iconComponent(
  "Package",
  Package02IconGlyph
);
export const Package2 = /* @__PURE__ */ iconComponent(
  "Package2",
  Package02IconGlyph
);
export const PackageCheck = /* @__PURE__ */ iconComponent(
  "PackageCheck",
  PackageDeliveredIconGlyph
);
export const PackageOpen = /* @__PURE__ */ iconComponent(
  "PackageOpen",
  PackageOpenIconGlyph
);
export const PawPrint = /* @__PURE__ */ iconComponent(
  "PawPrint",
  PawPrintGlyph
);
export const PenLine = /* @__PURE__ */ iconComponent(
  "PenLine",
  PencilEdit01IconGlyph
);
export const Pencil = /* @__PURE__ */ iconComponent(
  "Pencil",
  PencilEdit01IconGlyph
);
export const PencilSimple = /* @__PURE__ */ iconComponent(
  "PencilSimple",
  PencilEdit01IconGlyph
);
export const Phone = /* @__PURE__ */ iconComponent("Phone", TelephoneIconGlyph);
export const PieChart = /* @__PURE__ */ iconComponent(
  "PieChart",
  PieChartIconGlyph
);
export const Pill = /* @__PURE__ */ iconComponent("Pill", PillIconGlyph);
export const Pin = /* @__PURE__ */ iconComponent("Pin", PinIconGlyph);
export const Play = /* @__PURE__ */ iconComponent("Play", PlayIconGlyph);
export const PlayCircle = /* @__PURE__ */ iconComponent(
  "PlayCircle",
  PlayCircle02IconGlyph
);
export const Plus = /* @__PURE__ */ iconComponent("Plus", Add01IconGlyph);
export const Printer = /* @__PURE__ */ iconComponent(
  "Printer",
  PrinterIconGlyph
);
export const Pulse = /* @__PURE__ */ iconComponent(
  "Pulse",
  Activity01IconGlyph
);
export const Rabbit = /* @__PURE__ */ iconComponent("Rabbit", RabbitGlyph);
export const ReceiptText = /* @__PURE__ */ iconComponent(
  "ReceiptText",
  ReceiptTextIconGlyph
);
export const RefreshCcw = /* @__PURE__ */ iconComponent(
  "RefreshCcw",
  Refresh01IconGlyph
);
export const RefreshCw = /* @__PURE__ */ iconComponent(
  "RefreshCw",
  Refresh01IconGlyph
);
export const RotateCcw = /* @__PURE__ */ iconComponent(
  "RotateCcw",
  Undo02IconGlyph
);
export const Rows3 = /* @__PURE__ */ iconComponent(
  "Rows3",
  LayoutThreeRowIconGlyph
);
export const Scales = /* @__PURE__ */ iconComponent(
  "Scales",
  BalanceScaleIconGlyph
);
export const Scissors = /* @__PURE__ */ iconComponent(
  "Scissors",
  Scissor01IconGlyph
);
export const Search = /* @__PURE__ */ iconComponent(
  "Search",
  Search01IconGlyph
);
export const SearchIcon = /* @__PURE__ */ iconComponent(
  "SearchIcon",
  Search01IconGlyph
);
export const Send = /* @__PURE__ */ iconComponent("Send", SentIconGlyph);
export const Server = /* @__PURE__ */ iconComponent(
  "Server",
  ServerStack01IconGlyph
);
export const Settings2 = /* @__PURE__ */ iconComponent(
  "Settings2",
  Settings02IconGlyph
);
export const Shield = /* @__PURE__ */ iconComponent(
  "Shield",
  Shield01IconGlyph
);
export const ShieldAlert = /* @__PURE__ */ iconComponent(
  "ShieldAlert",
  SecurityCheckIconGlyph
);
export const ShieldCheck = /* @__PURE__ */ iconComponent(
  "ShieldCheck",
  Shield02IconGlyph
);
export const ShoppingCart = /* @__PURE__ */ iconComponent(
  "ShoppingCart",
  ShoppingCart01IconGlyph
);
export const Sparkle = /* @__PURE__ */ iconComponent(
  "Sparkle",
  SparklesIconGlyph
);
export const Sparkles = /* @__PURE__ */ iconComponent(
  "Sparkles",
  SparklesIconGlyph
);
export const Star = /* @__PURE__ */ iconComponent("Star", StarIconGlyph);
export const Stethoscope = /* @__PURE__ */ iconComponent(
  "Stethoscope",
  StethoscopeIconGlyph
);
export const Stop = /* @__PURE__ */ iconComponent("Stop", StopIconGlyph);
export const Syringe = /* @__PURE__ */ iconComponent(
  "Syringe",
  InjectionIconGlyph
);
export const Table2 = /* @__PURE__ */ iconComponent("Table2", Table01IconGlyph);
export const Thermometer = /* @__PURE__ */ iconComponent(
  "Thermometer",
  ThermometerIconGlyph
);
export const Timer = /* @__PURE__ */ iconComponent("Timer", Timer01IconGlyph);
export const Trash = /* @__PURE__ */ iconComponent("Trash", Delete02IconGlyph);
export const Trash2 = /* @__PURE__ */ iconComponent(
  "Trash2",
  Delete02IconGlyph
);
export const TrendUp = /* @__PURE__ */ iconComponent(
  "TrendUp",
  ChartUpIconGlyph
);
export const TrendingDown = /* @__PURE__ */ iconComponent(
  "TrendingDown",
  ChartDownIconGlyph
);
export const TrendingUp = /* @__PURE__ */ iconComponent(
  "TrendingUp",
  ChartUpIconGlyph
);
export const TriangleAlert = /* @__PURE__ */ iconComponent(
  "TriangleAlert",
  Alert02IconGlyph
);
export const TriangleAlertIcon = /* @__PURE__ */ iconComponent(
  "TriangleAlertIcon",
  Alert02IconGlyph
);
export const Trophy = /* @__PURE__ */ iconComponent("Trophy", Award01IconGlyph);
export const Turtle = /* @__PURE__ */ iconComponent("Turtle", TurtleGlyph);
export const UploadSimple = /* @__PURE__ */ iconComponent(
  "UploadSimple",
  Upload01IconGlyph
);
export const User = /* @__PURE__ */ iconComponent("User", User02IconGlyph);
export const UserCircle = /* @__PURE__ */ iconComponent(
  "UserCircle",
  UserCircleIconGlyph
);
export const UserRound = /* @__PURE__ */ iconComponent(
  "UserRound",
  User02IconGlyph
);
export const UserRoundCog = /* @__PURE__ */ iconComponent(
  "UserRoundCog",
  UserSettings01IconGlyph
);
export const Users = /* @__PURE__ */ iconComponent("Users", UserGroupIconGlyph);
export const UsersRound = /* @__PURE__ */ iconComponent(
  "UsersRound",
  UserGroupIconGlyph
);
export const Wallet = /* @__PURE__ */ iconComponent(
  "Wallet",
  Wallet01IconGlyph
);
export const WalletCards = /* @__PURE__ */ iconComponent(
  "WalletCards",
  Wallet01IconGlyph
);
export const WandSparkles = /* @__PURE__ */ iconComponent(
  "WandSparkles",
  SparklesIconGlyph
);
export const Warning = /* @__PURE__ */ iconComponent(
  "Warning",
  Alert02IconGlyph
);
export const WarningCircle = /* @__PURE__ */ iconComponent(
  "WarningCircle",
  InformationCircleIconGlyph
);
export const WarningDiamond = /* @__PURE__ */ iconComponent(
  "WarningDiamond",
  AlertDiamondIconGlyph
);
export const WarningOctagon = /* @__PURE__ */ iconComponent(
  "WarningOctagon",
  AlertDiamondIconGlyph
);
export const Wind = /* @__PURE__ */ iconComponent("Wind", FastWindIconGlyph);
export const Workflow = /* @__PURE__ */ iconComponent(
  "Workflow",
  WorkflowSquare01IconGlyph
);
export const X = /* @__PURE__ */ iconComponent("X", Cancel01IconGlyph);
export const XCircle = /* @__PURE__ */ iconComponent(
  "XCircle",
  CancelCircleIconGlyph
);
export const XIcon = /* @__PURE__ */ iconComponent("XIcon", Cancel01IconGlyph);
export const Zap = /* @__PURE__ */ iconComponent("Zap", ZapIconGlyph);
