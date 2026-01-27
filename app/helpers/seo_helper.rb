module SeoHelper
  def open_graph_tags
    safe_join([
      tag(:meta, property: "og:title", content: meta_title),
      tag(:meta, property: "og:description", content: meta_description),
      tag(:meta, property: "og:type", content: og_type),
      tag(:meta, property: "og:url", content: request.original_url),
      tag(:meta, property: "og:site_name", content: t("seo.site_name")),
      tag(:meta, property: "og:locale", content: I18n.locale == :fr ? "fr_FR" : "en_US"),
      tag(:meta, property: "og:image", content: og_image),
      tag(:meta, name: "twitter:card", content: "summary_large_image"),
      tag(:meta, name: "twitter:title", content: meta_title),
      tag(:meta, name: "twitter:description", content: meta_description),
      tag(:meta, name: "twitter:image", content: og_image)
    ])
  end

  def og_type
    "website"
  end

  def og_image
    case action_name
    when "villa"
      asset_url("villa/villa-1.jpg")
    when "bnbs"
      asset_url("bnbs/piscine.jpg")
    else
      asset_url("villa/homepage.jpg")
    end
  end

  def structured_data
    data = [organization_schema, local_business_schema]

    case action_name
    when "villa"
      data << villa_schema
    when "bnbs"
      data << bnbs_schema
    when "index"
      data << website_schema
    end

    safe_join(data.map { |d| structured_data_tag(d) })
  end

  private

  def structured_data_tag(data)
    content_tag(:script, data.to_json.html_safe, type: "application/ld+json")
  end

  def organization_schema
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": t("seo.organization_name"),
      "url": "https://giteslescelestins.com",
      "logo": asset_url("logo/logo.png"),
      "sameAs": [
        "https://www.airbnb.com/users/show/115617715",
        "https://www.booking.com/hotel/fr/les-celestins-chambres-d-hotes.fr.html"
      ]
    }
  end

  def local_business_schema
    {
      "@context": "https://schema.org",
      "@type": "LodgingBusiness",
      "name": t("seo.organization_name"),
      "description": t("meta.home.index.description"),
      "url": "https://giteslescelestins.com",
      "telephone": "+33490000000",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Les Célestins",
        "addressLocality": "Carpentras",
        "postalCode": "84200",
        "addressRegion": "Vaucluse",
        "addressCountry": "FR"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": 44.0556,
        "longitude": 5.0489
      },
      "image": asset_url("villa/homepage.jpg"),
      "priceRange": t("seo.price_range"),
      "amenityFeature": [
        { "@type": "LocationFeatureSpecification", "name": t("seo.amenities.free_wifi"), "value": true },
        { "@type": "LocationFeatureSpecification", "name": t("seo.amenities.swimming_pool"), "value": true },
        { "@type": "LocationFeatureSpecification", "name": t("seo.amenities.air_conditioning"), "value": true },
        { "@type": "LocationFeatureSpecification", "name": t("seo.amenities.free_parking"), "value": true }
      ],
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "reviewCount": "50",
        "bestRating": "5"
      }
    }
  end

  def website_schema
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": t("seo.site_name"),
      "url": "https://giteslescelestins.com"
    }
  end

  def villa_schema
    {
      "@context": "https://schema.org",
      "@type": "VacationRental",
      "name": t("meta.home.villa.title"),
      "description": t("meta.home.villa.description"),
      "url": "https://giteslescelestins.com/villa",
      "image": [
        asset_url("villa/villa-1.jpg"),
        asset_url("villa/mosaics/piscine.jpg"),
        asset_url("villa/mosaics/espace-detente.jpg")
      ],
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Carpentras",
        "postalCode": "84200",
        "addressRegion": "Vaucluse",
        "addressCountry": "FR"
      },
      "numberOfRooms": 3,
      "occupancy": {
        "@type": "QuantitativeValue",
        "maxValue": 6
      },
      "floorSize": {
        "@type": "QuantitativeValue",
        "value": 105,
        "unitCode": "MTK"
      },
      "amenityFeature": [
        { "@type": "LocationFeatureSpecification", "name": t("seo.amenities.private_pool"), "value": true },
        { "@type": "LocationFeatureSpecification", "name": t("seo.amenities.air_conditioning"), "value": true },
        { "@type": "LocationFeatureSpecification", "name": t("seo.amenities.free_wifi"), "value": true },
        { "@type": "LocationFeatureSpecification", "name": t("seo.amenities.boules_court"), "value": true },
        { "@type": "LocationFeatureSpecification", "name": t("seo.amenities.barbecue"), "value": true },
        { "@type": "LocationFeatureSpecification", "name": t("seo.amenities.ping_pong"), "value": true },
        { "@type": "LocationFeatureSpecification", "name": t("seo.amenities.foosball"), "value": true }
      ],
      "offers": {
        "@type": "Offer",
        "priceCurrency": "EUR",
        "price": "1930",
        "priceValidUntil": "2026-12-31",
        "availability": "https://schema.org/InStock",
        "validFrom": "2026-01-01"
      }
    }
  end

  def bnbs_schema
    {
      "@context": "https://schema.org",
      "@type": "BedAndBreakfast",
      "name": t("meta.home.bnbs.title"),
      "description": t("meta.home.bnbs.description"),
      "url": "https://giteslescelestins.com/chambres-hotes",
      "image": [
        asset_url("bnbs/piscine.jpg"),
        asset_url("bnbs/cabanon/cabanon-1.jpg"),
        asset_url("bnbs/roseraie/roseraie-1.jpg")
      ],
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Carpentras",
        "postalCode": "84200",
        "addressRegion": "Vaucluse",
        "addressCountry": "FR"
      },
      "amenityFeature": [
        { "@type": "LocationFeatureSpecification", "name": t("seo.amenities.breakfast_included"), "value": true },
        { "@type": "LocationFeatureSpecification", "name": t("seo.amenities.swimming_pool"), "value": true },
        { "@type": "LocationFeatureSpecification", "name": t("seo.amenities.air_conditioning"), "value": true },
        { "@type": "LocationFeatureSpecification", "name": t("seo.amenities.free_wifi"), "value": true }
      ],
      "priceRange": "120-130 EUR",
      "makesOffer": [
        {
          "@type": "Offer",
          "name": t("common.studio_cabanon"),
          "description": t("seo.bnbs.cabanon_description"),
          "priceCurrency": "EUR",
          "price": "130"
        },
        {
          "@type": "Offer",
          "name": t("common.studio_roseraie"),
          "description": t("seo.bnbs.roseraie_description"),
          "priceCurrency": "EUR",
          "price": "120"
        }
      ]
    }
  end
end
