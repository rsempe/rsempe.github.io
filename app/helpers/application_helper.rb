module ApplicationHelper
  def canonical_and_hreflangs
    base_url = request.base_url
    path = request.path

    tag(:link, rel: "canonical", href: "#{base_url}#{path}") +
    tag(:link, rel: "alternate", hreflang: "fr", href: "#{base_url}#{path}?locale=fr") +
    tag(:link, rel: "alternate", hreflang: "en", href: "#{base_url}#{path}?locale=en") +
    tag(:link, rel: "alternate", hreflang: "x-default", href: "#{base_url}#{path}")
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
