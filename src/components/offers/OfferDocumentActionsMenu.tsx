import { DotsThreeIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { OFFER_STATUS, type OfferStatus } from "@/lib/documents";
import type { Offer } from "@/lib/offers";

interface Props {
  offer: Offer;
  onView: (offer: Offer) => void;
  onEdit: (offer: Offer) => void;
  onStatus: (offer: Offer, status: OfferStatus) => void;
  onConvert: (offer: Offer) => void;
  onDuplicate: (offer: Offer) => void;
  onDelete: (id: number) => void;
}

export function OfferDocumentActionsMenu({
  offer,
  onView,
  onEdit,
  onStatus,
  onConvert,
  onDuplicate,
  onDelete,
}: Props) {
  return (
    <DropdownMenu>
      <TooltipProvider>
        <Tooltip>
          <DropdownMenuTrigger asChild>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Offer actions">
                <DotsThreeIcon className="size-4" />
              </Button>
            </TooltipTrigger>
          </DropdownMenuTrigger>
          <TooltipContent>Offer actions</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onView(offer)}>View</DropdownMenuItem>
        {offer.status === OFFER_STATUS.DRAFT && (
          <DropdownMenuItem onSelect={() => onEdit(offer)}>Edit</DropdownMenuItem>
        )}
        {offer.status === OFFER_STATUS.FINALIZED && (
          <>
            <DropdownMenuItem onSelect={() => onStatus(offer, OFFER_STATUS.ACCEPTED)}>
              Accept
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onStatus(offer, OFFER_STATUS.REJECTED)}>
              Reject
            </DropdownMenuItem>
          </>
        )}
        {offer.status === OFFER_STATUS.REJECTED && (
          <DropdownMenuItem onSelect={() => onStatus(offer, OFFER_STATUS.FINALIZED)}>
            Reopen
          </DropdownMenuItem>
        )}
        {offer.status === OFFER_STATUS.ACCEPTED && (
          <DropdownMenuItem onSelect={() => onConvert(offer)}>Convert to Invoice</DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => onDuplicate(offer)}>Duplicate</DropdownMenuItem>
        {offer.status === OFFER_STATUS.DRAFT && (
          <DropdownMenuItem onSelect={() => onDelete(offer.id)}>Delete</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
