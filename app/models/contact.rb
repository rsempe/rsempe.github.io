class Contact < MailForm::Base
  attribute :firstname, validate: true
  attribute :lastname, validate: true
  attribute :email, validate: /\A([\w\.%\+\-]+)@([\w\-]+\.)+([\w]{2,})\z/i
  attribute :phone, validate: true
  attribute :message, validate: true
  attribute :nickname, captcha: true

  # Declare the e-mail headers. It accepts anything the mail method
  # in ActionMailer accepts.
  def headers
    {
      subject: "Contact - GitesLesCelestins",
      to: "giteslescelestins@gmail.com",
      from: %("#{firstname}" "#{lastname}" <#{email}>)
    }
  end
end
