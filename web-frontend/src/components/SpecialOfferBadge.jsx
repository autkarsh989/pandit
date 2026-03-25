export default function SpecialOfferBadge({ offer, className = '' }) {
  if (!offer) return null;

  const formatDiscount = () => {
    if (offer.discount_percentage) {
      return `${offer.discount_percentage}% OFF`;
    }
    if (offer.discount_amount) {
      return `Rs ${offer.discount_amount} OFF`;
    }
    return offer.title || 'Special Offer';
  };

  const effectClass = offer.effect_type ? `special-offer-${offer.effect_type}` : '';

  return (
    <div
      className={`special-offer-badge ${effectClass} ${className}`.trim()}
      style={{ backgroundColor: offer.effect_color || '#db731c' }}
    >
      <div className="special-offer-title">{formatDiscount()}</div>
      {offer.description ? (
        <div className="special-offer-desc">{offer.description}</div>
      ) : null}
    </div>
  );
}
