//-- copyright
// OpenProject is a project management system.
// Copyright (C) 2012-2015 the OpenProject Foundation (OPF)
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License version 3.
//
// OpenProject is a fork of ChiliProject, which is a fork of Redmine. The copyright follows:
// Copyright (C) 2006-2013 Jean-Philippe Lang
// Copyright (C) 2010-2013 the ChiliProject Team
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License
// as published by the Free Software Foundation; either version 2
// of the License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
//
// See doc/COPYRIGHT.rdoc for more details.
//++

import {HalResource} from '../../api/api-v3/hal-resources/hal-resource.service';
import {UserResource} from '../../api/api-v3/hal-resources/user-resource.service';
import {CollectionResource} from '../../api/api-v3/hal-resources/collection-resource.service';
import {QueryFilterInstanceResource} from '../../api/api-v3/hal-resources/query-filter-instance-resource.service';
import {RootDmService} from '../../api/api-v3/hal-resource-dms/root-dm.service';
import {RootResource} from '../../api/api-v3/hal-resources/root-resource.service';
import {PathHelperService} from '../../common/path-helper/path-helper.service';
import {Component, EventEmitter, Inject, Input, OnInit, Output} from '@angular/core';
import {I18nToken, PathHelperToken} from 'core-app/angular4-transition-utils';
import {AngularTrackingHelpers} from 'core-components/angular/tracking-functions';

@Component({
  selector: 'filter-toggled-multiselect-value',
  template: require('!!raw-loader!./filter-toggled-multiselect-value.component.html')
})
export class FilterToggledMultiselectValueComponent implements OnInit {
  @Input() public filter:QueryFilterInstanceResource;
  @Output() public filterChanged = new EventEmitter<QueryFilterInstanceResource>();

  public isMultiselect:boolean;
  public availableOptions:HalResource[] = [];
  public compareByHrefOrString = AngularTrackingHelpers.compareByHrefOrString;

  readonly text = {
    placeholder: this.I18n.t('js.placeholders.selection'),
    enableMulti: this.I18n.t('js.work_packages.label_enable_multi_select'),
    disableMulti: this.I18n.t('js.work_packages.label_disable_multi_select')
  };

  constructor(readonly RootDm:RootDmService,
              @Inject(PathHelperToken) readonly PathHelper:PathHelperService,
              @Inject(I18nToken) readonly I18n:op.I18n) {
  }

  ngOnInit() {
    this.isMultiselect = this.isValueMulti(true);
    this.fetchAllowedValues();
  }

  public get value() {
    if (this.isValueMulti()) {
      return this.filter.values;
    } else if (this.filter.values.length > 0) {
      return this.filter.values[0];
    } else {
      return null;
    }
  }

  public set value(val:any) {
    this.filter.values = _.castArray(val);
    this.filterChanged.emit(this.filter);
  }

  public isValueMulti(ignoreStatus = false) {
    return (this.isMultiselect && !ignoreStatus) ||
      (this.filter.values && this.filter.values.length > 1);
  }

  public toggleMultiselect() {
    this.isMultiselect = !this.isMultiselect;
    return false;
  }

  public get hasNoValue() {
    return _.isEmpty(this.filter.values);
  }

  private fetchAllowedValues() {
    if ((this.filter.currentSchema!.values!.allowedValues as CollectionResource)['$load']) {
      this.loadAllowedValues();
    } else {
      this.availableOptions = (this.filter.currentSchema!.values!.allowedValues as HalResource[]);
    }
  }

  private loadAllowedValues() {
    let valuesSchema = this.filter.currentSchema!.values!;
    let loadingPromises = [(valuesSchema.allowedValues as any).$load()];

    // If it is a User resource, we want to have the 'me' option.
    // We therefore fetch the current user from the api and copy
    // the current user's value from the set of allowedValues. The
    // copy will have it's name altered to 'me' and will then be
    // prepended to the list.
    let isUserResource = valuesSchema.type.indexOf('User') > 0;
    if (isUserResource) {
      loadingPromises.push(this.RootDm.load());
    }

    Promise.all(loadingPromises)
      .then(((resources:Array<HalResource>) => {
        let options = (resources[0] as CollectionResource).elements;

        if (isUserResource && this.filter.filter.id !== 'memberOfGroup') {
          this.addMeValue(options, (resources[1] as RootResource).user);
        }

        this.availableOptions = options;
      }));
  }

  private addMeValue(options:HalResource[], currentUser:UserResource) {
    if (!(currentUser && currentUser.$href)) {
      return;
    }

    let me:HalResource = new HalResource({
      _links: {
        self: {
          href: this.PathHelper.apiV3UserMePath(),
          title: this.I18n.t('js.label_me')
        }
      }
    }, true);

    options.unshift(me);
  }
}
