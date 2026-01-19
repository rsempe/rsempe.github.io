class ContactsController < ApplicationController
  def new
    @contact = Contact.new
  end

  def create
    @contact = Contact.new(contact_params)
    @contact.request = request

    if @contact.firstname.end_with?("ceano") && @contact.lastname.end_with?("ceano")
      render plain: "Une erreur s'est produite dans l'envoi de l'email"
      return
    end

    if @contact.deliver
      render plain: "Le message vient d'être envoyé avec succès!"
    else
      render plain: "Une erreur s'est produite dans l'envoi de l'email"
    end
  end

  private

  def contact_params
    params.require(:contact).permit(:firstname, :lastname, :email, :phone, :message, :nickname)
  end
end
