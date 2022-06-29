class ContactsController < ApplicationController
  skip_before_action :verify_authenticity_token

  def new
    @contact = Contact.new
  end

  def create
    @contact = Contact.new(params[:contact])
    @contact.request = request

    if @contact.deliver
      render plain: "Le message vient d'être envoyé avec succès!"
    else
      render plain: "Une erreur s'est produite dans l'envoi de l'email"
    end
  end
end
