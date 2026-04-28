import { useState } from "react";
import { useListArticles, type Article } from "@workspace/api-client-react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { formatMoney } from "@/lib/format";

export function ArticleCombobox({
  value,
  onSelect,
}: {
  value?: string;
  onSelect: (article: Article) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: articles = [] } = useListArticles();
  const selected = articles.find((a) => a.reference === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          size="sm"
          className="w-full justify-between font-normal h-9"
        >
          <span className="truncate">
            {selected ? selected.reference : value || "Article…"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[480px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher par référence ou désignation…" />
          <CommandList>
            <CommandEmpty>Aucun article trouvé.</CommandEmpty>
            <CommandGroup>
              {articles.map((a) => (
                <CommandItem
                  key={a.id}
                  value={`${a.reference} ${a.designation}`}
                  onSelect={() => {
                    onSelect(a);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === a.reference ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold">{a.reference}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatMoney(a.prixUnitaire)} F
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground truncate">
                      {a.designation}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
