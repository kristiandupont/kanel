// Automatically generated. Don't change this file manually.

import Actor, { ActorInitializer } from './Actor';
import Address, { AddressInitializer } from './Address';
import Category, { CategoryInitializer } from './Category';
import City, { CityInitializer } from './City';
import Country, { CountryInitializer } from './Country';
import Customer, { CustomerInitializer } from './Customer';
import Film, { FilmInitializer } from './Film';
import FilmActor, { FilmActorInitializer } from './FilmActor';
import FilmCategory, { FilmCategoryInitializer } from './FilmCategory';
import Inventory, { InventoryInitializer } from './Inventory';
import Language, { LanguageInitializer } from './Language';
import Payment, { PaymentInitializer } from './Payment';
import Rental, { RentalInitializer } from './Rental';
import Staff, { StaffInitializer } from './Staff';
import Store, { StoreInitializer } from './Store';

type Model =
  | Actor
  | Address
  | Category
  | City
  | Country
  | Customer
  | Film
  | FilmActor
  | FilmCategory
  | Inventory
  | Language
  | Payment
  | Rental
  | Staff
  | Store

interface ModelTypeMap {
  'actor': Actor;
  'address': Address;
  'category': Category;
  'city': City;
  'country': Country;
  'customer': Customer;
  'film': Film;
  'filmActor': FilmActor;
  'filmCategory': FilmCategory;
  'inventory': Inventory;
  'language': Language;
  'payment': Payment;
  'rental': Rental;
  'staff': Staff;
  'store': Store;
}

type ModelId =

interface ModelIdTypeMap {
}

type Initializer =
  | ActorInitializer
  | AddressInitializer
  | CategoryInitializer
  | CityInitializer
  | CountryInitializer
  | CustomerInitializer
  | FilmInitializer
  | FilmActorInitializer
  | FilmCategoryInitializer
  | InventoryInitializer
  | LanguageInitializer
  | PaymentInitializer
  | RentalInitializer
  | StaffInitializer
  | StoreInitializer

interface InitializerTypeMap {
  'actor': ActorInitializer;
  'address': AddressInitializer;
  'category': CategoryInitializer;
  'city': CityInitializer;
  'country': CountryInitializer;
  'customer': CustomerInitializer;
  'film': FilmInitializer;
  'filmActor': FilmActorInitializer;
  'filmCategory': FilmCategoryInitializer;
  'inventory': InventoryInitializer;
  'language': LanguageInitializer;
  'payment': PaymentInitializer;
  'rental': RentalInitializer;
  'staff': StaffInitializer;
  'store': StoreInitializer;
}

export {
  Actor, ActorInitializer,
  Address, AddressInitializer,
  Category, CategoryInitializer,
  City, CityInitializer,
  Country, CountryInitializer,
  Customer, CustomerInitializer,
  Film, FilmInitializer,
  FilmActor, FilmActorInitializer,
  FilmCategory, FilmCategoryInitializer,
  Inventory, InventoryInitializer,
  Language, LanguageInitializer,
  Payment, PaymentInitializer,
  Rental, RentalInitializer,
  Staff, StaffInitializer,
  Store, StoreInitializer,

  Model,
  ModelTypeMap,
  ModelId,
  ModelIdTypeMap,
  Initializer,
  InitializerTypeMap
};
