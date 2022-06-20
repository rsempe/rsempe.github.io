Rails.application.routes.draw do
  root "home#index"

  resources :bnbs, only: [:index]
  resources :gites, only: [:index]
end
