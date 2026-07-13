export interface UserGroupQualifier {
  name: string
  value: string
}

export interface UserGroupProps {
  name?: string
  qualifiers?: UserGroupQualifier[]
}

export interface UserGroup {
  uuid: string
  surveyUuid?: string
  props: UserGroupProps
  dateCreated?: string
  dateModified?: string
}
