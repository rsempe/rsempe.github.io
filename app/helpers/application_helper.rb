module ApplicationHelper
  def canonical_and_hreflangs
    base_url = "https://giteslescelestins.com"
    path = request.path

    # Use canonical URL without query params for all hreflang variants
    # The same URL serves content in the user's preferred language
    canonical_url = "#{base_url}#{path}"

    tag(:link, rel: "canonical", href: canonical_url) +
    tag(:link, rel: "alternate", hreflang: "fr", href: canonical_url) +
    tag(:link, rel: "alternate", hreflang: "en", href: canonical_url) +
    tag(:link, rel: "alternate", hreflang: "x-default", href: canonical_url)
  end

  def meta_title(default_key = "home.index")
    t("meta.#{controller_name}.#{action_name}.title", default: t("meta.#{default_key}.title"))
  end

  def meta_description(default_key = "home.index")
    t("meta.#{controller_name}.#{action_name}.description", default: t("meta.#{default_key}.description"))
  end

  def meta_keywords(default_key = "home.index")
    t("meta.#{controller_name}.#{action_name}.keywords", default: t("meta.#{default_key}.keywords"))
  end
end
