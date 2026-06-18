import { DotsThreeIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OFFER_STATUS, type OfferStatus } from "@/lib/documents";
import type { Offer } from "@/lib/offers";

interface Props {
  offer: Offer;
  onOpen: (offer: Offer) => void;
  onStatus: (offer: Offer, status: OfferStatus) => void;
  onConvert: (offer: Offer) => void;
  onDuplicate: (offer: Offer) => void;
  onDelete: (id: number) => void;
}

export function OfferDocumentActionsMenu({
  offer,
  onOpen,
  onStatus,
  onConvert,
  onDuplicate,
  onDelete,
}: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" title="Offer actions">
          <DotsThreeIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onOpen(offer)}>Edit</DropdownMenuItem>
        {offer.status === OFFER_STATUS.FINALIZED && (
          <>
            <DropdownMenuItem onClick={() => onStatus(offer, OFFER_STATUS.ACCEPTED)}>
              Accept
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatus(offer, OFFER_STATUS.REJECTED)}>
              Reject
            </DropdownMenuItem>
          </>
        )}
        {offer.status === OFFER_STATUS.REJECTED && (
          <DropdownMenuItem onClick={() => onStatus(offer, OFFER_STATUS.FINALIZED)}>
            Reopen
          </DropdownMenuItem>
        )}
        {offer.status === OFFER_STATUS.ACCEPTED && (
          <DropdownMenuItem onClick={() => onConvert(offer)}>Convert to Invoice</DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => onDuplicate(offer)}>Duplicate</DropdownMenuItem>
        {offer.status === OFFER_STATUS.DRAFT && (
          <DropdownMenuItem onClick={() => onDelete(offer.id)}>Delete</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
