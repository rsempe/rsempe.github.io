class ApplicationController < ActionController::Base
  before_action :change_locale, :set_locale

  private

  def change_locale
    if params[:locale] && I18n.available_locales.include?(params[:locale].to_sym)
      session[:locale] = params[:locale]
    end
  end

  def set_locale
    if session[:locale]
      I18n.locale = session[:locale]
    else
      I18n.locale = http_accept_language.compatible_language_from(I18n.available_locales)
    end
  end
end
