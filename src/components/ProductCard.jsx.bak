import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatINR } from '../utils/format.js';
import Stars from './Stars.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import { useData } from '../context/DataContext.jsx';

export default function ProductCard({ product }) {
  const soldOut = product.stock <= 0;
  const { user } = useAuth();
  const { isWishlisted, toggle } = useWishlist();
  const { ratingFor } = useData();
  const nav = useNavigate();
  const saved = isWishlisted(product.id);
  const rating = ratingFor(product.id);

  const onWish = () => {
    if (!user) {
      nav('/login');
      return;
    }
    toggle(product.id);
  };

  return (
    <div className="product-card">
      <div className="pc-imgwrap">
        <Link to={`/product/${product.id}`} className="pc-imglink">
          <img src={product.image} alt={product.name} loading="lazy" />
          {soldOut && <span className="ribbon">Sold out</span>}
          {!soldOut && product.shippingCost === 0 && <span className="ribbon free">Free ship</span>}
          {!soldOut && product.shippingCost !== 0 && product.oldPrice ? <span className="ribbon sale">Sale</span> : null}
        </Link>
        <button
          className={`wish-btn ${saved ? 'active' : ''}`}
          onClick={onWish}
          aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'}
          title={saved ? 'Saved' : 'Save to wishlist'}
        >
          {saved ? '♥' : '♡'}
        </button>
      </div>
      <div className="pc-body">
        <h3>
          <Link to={`/product/${product.id}`}>{product.name}</Link>
        </h3>
        <div className="pc-price">
          <span className="price">{formatINR(product.price)}</span>
          {product.mrp > product.price && (
            <span className="mrp">{formatINR(product.mrp)}</span>
          )}
        </div>
        <div className="pc-meta-row">
          {product.returnsAccepted ? (
            <span className="return-badge ok">↩ {product.returnDays}d returns</span>
          ) : (
            <span className="return-badge no">No returns</span>
          )}
          {product.shippingCost === 0 && (
            <span className="ship-badge">Free ship</span>
          )}
        </div>
        {rating.count > 0 && (
          <div className="pc-rating">
            <Stars value={rating.avg} count={rating.count} size={13} />
          </div>
        )}
      </div>
    </div>
  );
}