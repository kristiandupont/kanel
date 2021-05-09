// @generated
// Automatically generated. Don't change this file manually.
// Name: undefined

import Actor, { ActorInitializer, ActorId } from './Actor';
import Address, { AddressInitializer, AddressId } from './Address';
import Category, { CategoryInitializer, CategoryId } from './Category';
import City, { CityInitializer, CityId } from './City';
import Country, { CountryInitializer, CountryId } from './Country';
import Customer, { CustomerInitializer, CustomerId } from './Customer';
import Film, { FilmInitializer, FilmId } from './Film';
import FilmActor, { FilmActorInitializer } from './FilmActor';
import FilmCategory, { FilmCategoryInitializer } from './FilmCategory';
import Inventory, { InventoryInitializer, InventoryId } from './Inventory';
import Language, { LanguageInitializer, LanguageId } from './Language';
import Payment, { PaymentInitializer, PaymentId } from './Payment';
import Rental, { RentalInitializer, RentalId } from './Rental';
import Store, { StoreInitializer, StoreId } from './Store';
import ActorInfo from './ActorInfo';
import CustomerList from './CustomerList';
import NicerButSlowerFilmList from './NicerButSlowerFilmList';
import SalesByFilmCategory from './SalesByFilmCategory';
import SalesByStore from './SalesByStore';
import StaffList from './StaffList';
import MpaaRating from './MpaaRating';

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
  | Store
  | ActorInfo
  | CustomerList
  | NicerButSlowerFilmList
  | SalesByFilmCategory
  | SalesByStore
  | StaffList

interface ModelTypeMap {
  'actor': Actor;
  'address': Address;
  'category': Category;
  'city': City;
  'country': Country;
  'customer': Customer;
  'film': Film;
  'film_actor': FilmActor;
  'film_category': FilmCategory;
  'inventory': Inventory;
  'language': Language;
  'payment': Payment;
  'rental': Rental;
  'store': Store;
  'actor_info': ActorInfo;
  'customer_list': CustomerList;
  'nicer_but_slower_film_list': NicerButSlowerFilmList;
  'sales_by_film_category': SalesByFilmCategory;
  'sales_by_store': SalesByStore;
  'staff_list': StaffList;
}

type ModelId =
  | ActorId
  | AddressId
  | CategoryId
  | CityId
  | CountryId
  | CustomerId
  | FilmId
  | InventoryId
  | LanguageId
  | PaymentId
  | RentalId
  | StoreId

interface ModelIdTypeMap {
  'actor': ActorId;
  'address': AddressId;
  'category': CategoryId;
  'city': CityId;
  'country': CountryId;
  'customer': CustomerId;
  'film': FilmId;
  'inventory': InventoryId;
  'language': LanguageId;
  'payment': PaymentId;
  'rental': RentalId;
  'store': StoreId;
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
  | StoreInitializer

interface InitializerTypeMap {
  'actor': ActorInitializer;
  'address': AddressInitializer;
  'category': CategoryInitializer;
  'city': CityInitializer;
  'country': CountryInitializer;
  'customer': CustomerInitializer;
  'film': FilmInitializer;
  'film_actor': FilmActorInitializer;
  'film_category': FilmCategoryInitializer;
  'inventory': InventoryInitializer;
  'language': LanguageInitializer;
  'payment': PaymentInitializer;
  'rental': RentalInitializer;
  'store': StoreInitializer;
}

export type {
  Actor, ActorInitializer, ActorId,
  Address, AddressInitializer, AddressId,
  Category, CategoryInitializer, CategoryId,
  City, CityInitializer, CityId,
  Country, CountryInitializer, CountryId,
  Customer, CustomerInitializer, CustomerId,
  Film, FilmInitializer, FilmId,
  FilmActor, FilmActorInitializer,
  FilmCategory, FilmCategoryInitializer,
  Inventory, InventoryInitializer, InventoryId,
  Language, LanguageInitializer, LanguageId,
  Payment, PaymentInitializer, PaymentId,
  Rental, RentalInitializer, RentalId,
  Store, StoreInitializer, StoreId,
  ActorInfo,
  CustomerList,
  NicerButSlowerFilmList,
  SalesByFilmCategory,
  SalesByStore,
  StaffList,
  MpaaRating,

  Model,
  ModelTypeMap,
  ModelId,
  ModelIdTypeMap,
  Initializer,
  InitializerTypeMap
};
