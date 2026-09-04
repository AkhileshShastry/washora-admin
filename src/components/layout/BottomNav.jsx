import { BarChart3, ClipboardList, IndianRupee, Settings, Shirt, Users } from "lucide-react";

const navItems = [
  { key: "Dashboard", icon: BarChart3 },
  { key: "Orders", icon: ClipboardList },
  { key: "Customers", icon: Users },
  { key: "Expenses", icon: IndianRupee },
  { key: "Pricing", icon: Shirt },
  { key: "Settings", icon: Settings },
];

export function BottomNav({ activePage, onPageChange }) {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activePage === item.key;

        return (
          <button
            className={`bottom-nav__item ${isActive ? "bottom-nav__item--active" : ""}`}
            type="button"
            key={item.key}
            onClick={() => onPageChange(item.key)}
          >
            <Icon size={20} strokeWidth={1.9} />
            <span>{item.key}</span>
          </button>
        );
      })}
    </nav>
  );
}
