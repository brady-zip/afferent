import {
  ArrowUp,
  ChevronRight,
  CircleAlert,
  LoaderCircle,
  MessageSquare,
  Plus,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

export type AfferentIcon = ComponentType<SVGProps<SVGSVGElement>>;

export type AfferentIconSlots = Readonly<{
  create: AfferentIcon;
  error: AfferentIcon;
  loading: AfferentIcon;
  comments: AfferentIcon;
  votes: AfferentIcon;
  disclosure: AfferentIcon;
}>;

export const defaultAfferentIcons: AfferentIconSlots = {
  create: Plus,
  error: CircleAlert,
  loading: LoaderCircle,
  comments: MessageSquare,
  votes: ArrowUp,
  disclosure: ChevronRight,
};
