Rails.application.routes.draw do
  root "home#index"

  get "villa", controller: :home, action: :villa
  get "chambres-hotes", controller: :home, action: :bnbs
end
